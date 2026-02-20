import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMediaDto, UploadMediaDto } from './dto';
import {
  BulkDeleteResultEntity,
  MediaEntity,
  MediaListEntity,
} from './entities';
import { MinioService } from 'src/minio';

/** Allowed image MIME types */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/avif',
];

/** 5 MB in bytes */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────

  /** Validate a single file for MIME type and size. */
  private validateFile(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File "${file.originalname}" exceeds the 5 MB limit.`,
      );
    }
  }

  /** Generate a unique object key preserving the original extension. */
  private generateObjectKey(originalName: string): string {
    const ext = extname(originalName).toLowerCase();
    const date = new Date();
    const folder = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `images/${folder}/${randomUUID()}${ext}`;
  }

  // ── Single Upload ────────────────────────────────────────────

  async uploadSingle(
    file: Express.Multer.File,
    uploaderId: string,
    dto: UploadMediaDto,
  ): Promise<MediaEntity> {
    if (!file) {
      throw new BadRequestException('No file provided.');
    }
    this.validateFile(file);

    const objectKey = this.generateObjectKey(file.originalname);
    await this.minio.upload(objectKey, file.buffer, file.size, file.mimetype);
    const url = this.minio.getObjectUrl(objectKey);
    const bucket = this.minio.getBucket();

    const media = await this.prisma.media.create({
      data: {
        uploaderId,
        filename: objectKey,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        bucket,
        url,
        alt: dto.alt ?? null,
      },
    });

    this.logger.log(`Uploaded: ${media.id} → ${objectKey}`);
    return media;
  }

  // ── Multiple Upload ──────────────────────────────────────────

  async uploadMultiple(
    files: Express.Multer.File[],
    uploaderId: string,
    dto: UploadMediaDto,
  ): Promise<MediaEntity[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided.');
    }

    // Validate all files before uploading any
    for (const file of files) {
      this.validateFile(file);
    }

    const results: MediaEntity[] = [];
    const bucket = this.minio.getBucket();

    for (const file of files) {
      const objectKey = this.generateObjectKey(file.originalname);
      await this.minio.upload(objectKey, file.buffer, file.size, file.mimetype);
      const url = this.minio.getObjectUrl(objectKey);

      const media = await this.prisma.media.create({
        data: {
          uploaderId,
          filename: objectKey,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          bucket,
          url,
          alt: dto.alt ?? null,
        },
      });

      results.push(media);
    }

    this.logger.log(
      `Uploaded ${results.length} file(s) for user ${uploaderId}`,
    );
    return results;
  }

  // ── Find One ─────────────────────────────────────────────────

  async findOne(id: string): Promise<MediaEntity> {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new NotFoundException(`Media with id "${id}" not found.`);
    }
    return media;
  }

  // ── Find All (for current user, paginated) ──────────────────

  async findAllByUser(
    uploaderId: string,
    page = 1,
    limit = 20,
  ): Promise<MediaListEntity> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.media.findMany({
        where: { uploaderId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.media.count({ where: { uploaderId } }),
    ]);

    return { data, total, page, limit };
  }

  // ── Update (alt text / replace image) ────────────────────────

  async update(
    id: string,
    uploaderId: string,
    dto: UpdateMediaDto,
    newFile?: Express.Multer.File,
  ): Promise<MediaEntity> {
    const existing = await this.prisma.media.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Media with id "${id}" not found.`);
    }
    if (existing.uploaderId !== uploaderId) {
      throw new ForbiddenException('You can only update your own media.');
    }

    const updateData: Record<string, any> = {};

    if (dto.alt !== undefined) {
      updateData.alt = dto.alt;
    }

    // Replace the image on MinIO if a new file is provided
    if (newFile) {
      this.validateFile(newFile);

      const newObjectKey = this.generateObjectKey(newFile.originalname);
      await this.minio.upload(
        newObjectKey,
        newFile.buffer,
        newFile.size,
        newFile.mimetype,
      );

      // Delete old object (fire-and-forget)
      this.minio.delete(existing.filename).catch((err) => {
        this.logger.warn(
          `Failed to delete old object: ${existing.filename}`,
          err,
        );
      });

      updateData.filename = newObjectKey;
      updateData.originalName = newFile.originalname;
      updateData.mimeType = newFile.mimetype;
      updateData.size = newFile.size;
      updateData.url = this.minio.getObjectUrl(newObjectKey);
    }

    const updated = await this.prisma.media.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Updated media: ${id}`);
    return updated;
  }

  // ── Delete Single ────────────────────────────────────────────

  async remove(id: string, uploaderId: string): Promise<MediaEntity> {
    const existing = await this.prisma.media.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Media with id "${id}" not found.`);
    }
    if (existing.uploaderId !== uploaderId) {
      throw new ForbiddenException('You can only delete your own media.');
    }

    await this.prisma.media.delete({ where: { id } });

    // Delete from MinIO (fire-and-forget)
    this.minio.delete(existing.filename).catch((err) => {
      this.logger.warn(`Failed to delete object: ${existing.filename}`, err);
    });

    this.logger.log(`Deleted media: ${id}`);
    return existing;
  }

  // ── Bulk Delete ──────────────────────────────────────────────

  async removeBulk(
    ids: string[],
    uploaderId: string,
  ): Promise<BulkDeleteResultEntity> {
    // Only delete media belonging to the requesting user
    const mediaItems = await this.prisma.media.findMany({
      where: { id: { in: ids }, uploaderId },
    });

    if (mediaItems.length === 0) {
      throw new NotFoundException('No matching media found to delete.');
    }

    await this.prisma.media.deleteMany({
      where: { id: { in: mediaItems.map((m) => m.id) } },
    });

    // Delete objects from MinIO (fire-and-forget)
    const objectKeys = mediaItems.map((m) => m.filename);
    this.minio.deleteMany(objectKeys).catch((err) => {
      this.logger.warn('Failed to bulk-delete objects from MinIO', err);
    });

    this.logger.log(
      `Bulk-deleted ${mediaItems.length} media item(s) for user ${uploaderId}`,
    );

    return {
      deleted: mediaItems.length,
      message: `Successfully deleted ${mediaItems.length} media item(s).`,
    };
  }
}
