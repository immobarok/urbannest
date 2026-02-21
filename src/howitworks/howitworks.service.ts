import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { MinioService } from 'src/minio';
import { CreateHowitworkSectionDto } from './dto/create-howitwork.dto';
import { UpdateHowitworkSectionDto } from './dto/update-howitwork.dto';
import { CreateHowitworkStepDto } from './dto/create-howitwork-step.dto';
import { UpdateStepDto } from './dto/update-howitwork-step.dto';

/** Allowed icon MIME types */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

/** 2 MB in bytes */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

@Injectable()
export class HowitworksService {
  private readonly logger = new Logger(HowitworksService.name);

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
        `File "${file.originalname}" exceeds the 2 MB limit.`,
      );
    }
  }

  /** Generate a unique object key preserving the original extension. */
  private generateIconKey(originalName: string): string {
    const ext = extname(originalName).toLowerCase();
    const date = new Date();
    const folder = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `howitworks/${folder}/${randomUUID()}${ext}`;
  }

  /** Upload a file to Minio and return the public URL. */
  private async uploadIcon(file: Express.Multer.File): Promise<string> {
    this.validateFile(file);
    const objectKey = this.generateIconKey(file.originalname);
    await this.minio.upload(objectKey, file.buffer, file.size, file.mimetype);
    return this.minio.getObjectUrl(objectKey);
  }

  /** Extract the Minio object key from a full URL. Returns null if not a minio URL. */
  private extractObjectKey(url: string): string | null {
    const bucket = this.minio.getBucket();
    const marker = `/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length);
  }

  /** Safely delete an old icon from Minio (best-effort, won't throw). */
  private async deleteOldIcon(
    iconUrl: string | null | undefined,
  ): Promise<void> {
    if (!iconUrl) return;
    const objectKey = this.extractObjectKey(iconUrl);
    if (!objectKey) return;
    try {
      await this.minio.delete(objectKey);
      this.logger.debug(`Deleted old icon: ${objectKey}`);
    } catch (error) {
      this.logger.warn(`Failed to delete old icon ${objectKey}: ${error}`);
    }
  }

  // ── Section CRUD ─────────────────────────────────────────────

  /**
   * Create a new HowItWorks section.
   * Replaces any existing section (singleton pattern).
   */
  async create(dto: CreateHowitworkSectionDto) {
    this.logger.log(`Creating HowItWorks Section: ${JSON.stringify(dto)}`);

    // Use a transaction to safely replace existing section(s)
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.howItWorksSection.findMany({
        include: { steps: true },
      });

      // Clean up old icons from Minio before deleting
      for (const section of existing) {
        for (const step of section.steps) {
          await this.deleteOldIcon(step.icon);
        }
      }

      if (existing.length > 0) {
        await tx.howItWorksSection.deleteMany();
      }

      return tx.howItWorksSection.create({
        data: {
          title: dto.title,
          isActive: dto.isActive ?? true,
          steps: dto.steps
            ? {
                create: dto.steps.map((step) => ({
                  title: step.title,
                  description: step.description,
                  icon: step.icon,
                  order: step.order ?? 0,
                  isActive: step.isActive ?? true,
                })),
              }
            : undefined,
        },
        include: { steps: { orderBy: { order: 'asc' } } },
      });
    });
  }

  /** Find all sections with their steps. */
  async findAll() {
    return this.prisma.howItWorksSection.findMany({
      include: {
        steps: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            icon: true,
            order: true,
            isActive: true,
          },
        },
      },
    });
  }

  /** Find a single section by ID. */
  async findOne(id: string) {
    const section = await this.prisma.howItWorksSection.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: 'asc' } } },
    });

    if (!section) {
      throw new NotFoundException(`HowItWorks Section "${id}" not found`);
    }

    return section;
  }

  /** Update a section's metadata (title, isActive). */
  async update(id: string, dto: UpdateHowitworkSectionDto) {
    this.logger.log(`Updating HowItWorks Section ${id}`);

    // Verify existence
    await this.findOne(id);

    return this.prisma.howItWorksSection.update({
      where: { id },
      data: {
        title: dto.title,
        isActive: dto.isActive,
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
  }

  // ── Step CRUD ────────────────────────────────────────────────

  /** Create a step and optionally upload an icon file. */
  async createStep(dto: CreateHowitworkStepDto, file?: Express.Multer.File) {
    this.logger.log(`Creating HowItWorks Step: ${dto.title}`);

    // 1. Upload Icon first (if any)
    const icon = file ? await this.uploadIcon(file) : dto.icon;

    // 2. Find ANY existing section (Singleton approach)
    let section = await this.prisma.howItWorksSection.findFirst();

    // 3. Auto-create section if missing
    if (!section) {
      section = await this.prisma.howItWorksSection.create({
        data: {
          title: 'How It Works', // Default title
          isActive: true,
        },
      });
      this.logger.log(`Auto-created default HowItWorks Section: ${section.id}`);
    }

    // 4. Create Step linked to that section
    return this.prisma.howItWorksStep.create({
      data: {
        title: dto.title,
        description: dto.description,
        icon,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
        sectionId: section.id, // <--- Auto-assigned!
      },
    });
  }

  /** Update a step and optionally replace its icon. */
  async updateStep(id: string, dto: UpdateStepDto, file?: Express.Multer.File) {
    this.logger.log(`Updating HowItWorks Step ${id}`);

    const existing = await this.prisma.howItWorksStep.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`HowItWorks Step "${id}" not found`);
    }

    let icon = dto.icon;
    if (file) {
      icon = await this.uploadIcon(file);
      // Clean up old icon
      await this.deleteOldIcon(existing.icon);
    }

    // Verify new sectionId if changed
    if (dto.sectionId && dto.sectionId !== existing.sectionId) {
      const section = await this.prisma.howItWorksSection.findUnique({
        where: { id: dto.sectionId },
      });
      if (!section) {
        throw new NotFoundException(
          `HowItWorks Section "${dto.sectionId}" not found`,
        );
      }
    }

    return this.prisma.howItWorksStep.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        icon,
        order: dto.order,
        isActive: dto.isActive,
        sectionId: dto.sectionId,
      },
    });
  }

  /** Remove a step and clean up its icon from storage. */
  async removeStep(id: string) {
    this.logger.log(`Removing HowItWorks Step: ${id}`);

    const step = await this.prisma.howItWorksStep.findUnique({
      where: { id },
    });
    if (!step) {
      throw new NotFoundException(`HowItWorks Step "${id}" not found`);
    }

    // Clean up icon from storage
    await this.deleteOldIcon(step.icon);

    return this.prisma.howItWorksStep.delete({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });
  }
}
