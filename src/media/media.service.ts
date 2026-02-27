import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
	OnModuleInit,
} from '@nestjs/common';
import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { lookup } from 'mime-types';
import * as Minio from 'minio';
import { PrismaService } from '../prisma/prisma.service';
import { UploadMediaDto, UpdateMediaDto } from './dto';
import { MediaEntity, MediaListEntity, BulkDeleteResultEntity } from './entities';

@Injectable()
export class MediaService implements OnModuleInit {
	private readonly logger = new Logger(MediaService.name);
	private minioClient: Minio.Client;
	private readonly bucketName: string;
	private readonly mediaEndpoint = process.env.MINIO_ENDPOINT as string;
	private readonly accessKeyId = process.env.MINIO_ACCESS_KEY as string;
	private readonly secretAccessKey = process.env.MINIO_SECRET_KEY as string;
	private readonly endpointPort = parseInt(process.env.MINIO_PORT ?? '9000');
	private readonly useSSL = process.env.MINIO_USE_SSL === 'true';

	private readonly imageExtensions = [
		'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico',
	];
	private readonly videoExtensions = [
		'.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v', '.mpg', '.mpeg',
	];

	public static readonly ALLOWED_IMAGE_MIMES = [
		'image/jpeg',
		'image/png',
		'image/gif',
		'image/webp',
		'image/svg+xml',
		'image/avif',
	];

	public static readonly MAX_SIZE_5MB = 5 * 1024 * 1024;

	constructor(private readonly prisma: PrismaService) {
		const rawBucketName = process.env.MINIO_BUCKET as string;
		if (!rawBucketName) {
			throw new Error('MINIO_BUCKET environment variable is required');
		}

		this.bucketName = this.sanitizeBucketName(rawBucketName);

		if (rawBucketName !== this.bucketName) {
			this.logger.warn(
				`Bucket name sanitized from "${rawBucketName}" to "${this.bucketName}"`,
			);
		}

		this.logger.log(`🔧 Initializing MinIO Client with endpoint: ${this.mediaEndpoint}`);
		this.logger.log(`🪣 Target bucket name: "${this.bucketName}"`);

		this.minioClient = new Minio.Client({
			endPoint: this.mediaEndpoint,
			port: this.endpointPort,
			useSSL: this.useSSL,
			accessKey: this.accessKeyId,
			secretKey: this.secretAccessKey,
		});
	}

	// ============================================
	// PRIVATE - BUCKET SETUP
	// ============================================

	private sanitizeBucketName(name: string): string {
		return name
			.toLowerCase()
			.replace(/_/g, '-')
			.replace(/[^a-z0-9.-]/g, '')
			.replace(/^[.-]+|[.-]+$/g, '')
			.replace(/\.{2,}/g, '.')
			.replace(/-{2,}/g, '-')
			.slice(0, 63);
	}

	async onModuleInit() {
		try {
			this.validateBucketName();
			await this.ensureBucketExists();
			await this.ensureBucketIsPublic();
			await this.uploadPlaceholderImages();
		} catch (error) {
			this.logger.error('Failed to initialize MediaService:', error);
			throw error;
		}
	}

	private validateBucketName() {
		const bucketNameRegex = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;

		if (this.bucketName.length < 3 || this.bucketName.length > 63) {
			throw new Error(
				`Bucket name must be between 3-63 characters. Current: "${this.bucketName}" (${this.bucketName.length} chars)`,
			);
		}

		if (!bucketNameRegex.test(this.bucketName)) {
			throw new Error(
				`Invalid bucket name: "${this.bucketName}". Must contain only lowercase letters, numbers, hyphens, and periods.`,
			);
		}

		const ipRegex = /^\d+\.\d+\.\d+\.\d+$/;
		if (ipRegex.test(this.bucketName)) {
			throw new Error(
				`Bucket name cannot be formatted as IP address: "${this.bucketName}"`,
			);
		}

		if (this.bucketName.includes('..')) {
			throw new Error(
				`Bucket name cannot contain consecutive periods: "${this.bucketName}"`,
			);
		}

		this.logger.log(`Bucket name "${this.bucketName}" is valid`);
	}

	private async ensureBucketExists() {
		try {
			this.logger.log('Checking if bucket exists...');

			const exists = await this.minioClient.bucketExists(this.bucketName);

			if (exists) {
				this.logger.log(`Bucket "${this.bucketName}" already exists`);
			} else {
				this.logger.log(`Bucket "${this.bucketName}" not found. Creating...`);
				await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
				this.logger.log(`Bucket "${this.bucketName}" created successfully`);
			}
		} catch (error: any) {
			this.logger.error('Error checking/creating bucket:', error.message);
			throw error;
		}
	}

	private async ensureBucketIsPublic() {
		const policy = JSON.stringify({
			Version: '2012-10-17',
			Statement: [
				{
					Effect: 'Allow',
					Principal: { AWS: ['*'] },
					Action: ['s3:GetObject'],
					Resource: [`arn:aws:s3:::${this.bucketName}/*`],
				},
			],
		});

		try {
			await this.minioClient.setBucketPolicy(this.bucketName, policy);
			this.logger.log('Bucket policy set to public successfully');
		} catch (error) {
			this.logger.warn('Bucket policy not set (default permissions apply)');
			this.logger.debug('Policy error (safe to ignore):', error);
		}
	}

	// ============================================
	// PRIVATE - PLACEHOLDER IMAGES
	// ============================================

	private async uploadPlaceholderImages() {
		try {
			const placeholderFolder = join(process.cwd(), 'public', 'placeholders');
			this.logger.log(`Checking for placeholder images in: /public/placeholders`);

			let files: string[];
			try {
				files = await readdir(placeholderFolder);
			} catch {
				this.logger.warn(`Placeholder folder not found: ${placeholderFolder}`);
				return;
			}

			const imageFiles = files.filter((file) =>
				this.imageExtensions.includes(extname(file).toLowerCase()),
			);

			if (imageFiles.length === 0) {
				this.logger.log('No placeholder images found');
				return;
			}

			this.logger.log(`Found ${imageFiles.length} placeholder image(s)`);

			for (const fileName of imageFiles) {
				await this.uploadPlaceholderIfNotExists(placeholderFolder, fileName);
			}

			this.logger.log('Placeholder images sync completed');
		} catch (error) {
			this.logger.error('Error uploading placeholder images:', error);
		}
	}

	private async uploadPlaceholderIfNotExists(folderPath: string, fileName: string) {
		const key = `placeholders/${fileName}`;

		try {
			await this.minioClient.statObject(this.bucketName, key);
			this.logger.log(`Skipping "${fileName}" (already exists)`);
		} catch (error: any) {
			if (error.code === 'NotFound' || error.message?.includes('Not Found')) {
				await this.uploadPlaceholderFile(folderPath, fileName, key);
			} else {
				this.logger.error(`Error checking "${fileName}":`, error);
			}
		}
	}

	private async uploadPlaceholderFile(folderPath: string, fileName: string, key: string) {
		try {
			const fileBuffer = await readFile(join(folderPath, fileName));
			const mimeType = this.getMimeType(fileName);

			await this.minioClient.putObject(
				this.bucketName,
				key,
				fileBuffer,
				fileBuffer.length,
				{ 'Content-Type': mimeType },
			);

			this.logger.log(`Uploaded "${fileName}" to MinIO`);
		} catch (error) {
			this.logger.error(`Error uploading "${fileName}":`, error);
		}
	}

	// ============================================
	// PRIVATE - HELPERS
	// ============================================

	private getMimeType(fileName: string): string {
		const detected = lookup(fileName);
		return typeof detected === 'string' ? detected : 'application/octet-stream';
	}

	private getFileCategory(fileName: string): 'images' | 'videos' | 'files' {
		const ext = extname(fileName).toLowerCase();
		if (this.imageExtensions.includes(ext)) return 'images';
		if (this.videoExtensions.includes(ext)) return 'videos';
		return 'files';
	}

	private getOrganizedFolder(fileName: string, customFolder?: string): string {
		const category = this.getFileCategory(fileName);
		return customFolder ? `${category}/${customFolder}/` : `${category}/`;
	}

	// ============================================
	// PUBLIC API METHODS
	// ============================================

	/**
	 * Upload a single file to MinIO with automatic folder organization.
	 * Images → 'images/', Videos → 'videos/', Others → 'files/'
	 */
	async uploadFile(
		file: Express.Multer.File,
		customFolder?: string,
	): Promise<{ key: string; url: string; category: string }> {
		if (!file) {
			throw new BadRequestException('No file provided');
		}

		// Validate file size and type
		this.validateFile(file);

		const folder = this.getOrganizedFolder(file.originalname, customFolder);
		const key = `${folder}${Date.now()}-${file.originalname}`;
		const category = this.getFileCategory(file.originalname);

		await this.minioClient.putObject(
			this.bucketName,
			key,
			file.buffer,
			file.buffer.length,
			{ 'Content-Type': file.mimetype },
		);

		this.logger.log(`Uploaded file: "${key}"`);

		return { key, url: this.getPublicUrl(key), category };
	}

	/**
	 * Upload multiple files to MinIO concurrently.
	 * Each file is auto-organized by type (images/videos/files).
	 */
	async uploadFiles(
		files: Express.Multer.File[],
		customFolder?: string,
	): Promise<{ key: string; url: string; category: string }[]> {
		if (!files || files.length === 0) {
			throw new BadRequestException('No files provided');
		}

		this.logger.log(`Uploading ${files.length} file(s)...`);

		const results = await Promise.all(
			files.map((file) => this.uploadFile(file, customFolder)),
		);

		this.logger.log(`Successfully uploaded ${results.length} file(s)`);

		return results;
	}

	/**
	 * Delete a file from MinIO by its key.
	 */
	async deleteFile(key: string): Promise<void> {
		if (!key) {
			throw new BadRequestException('File key is required');
		}

		await this.minioClient.removeObject(this.bucketName, key);
		this.logger.log(`🗑 Deleted file: "${key}"`);
	}

	/**
	 * Delete multiple files from MinIO concurrently.
	 */
	async deleteFiles(keys: string[]): Promise<void> {
		if (!keys || keys.length === 0) {
			throw new BadRequestException('No file keys provided');
		}

		this.logger.log(`🗑 Deleting ${keys.length} file(s)...`);
		await this.minioClient.removeObjects(this.bucketName, keys);
		this.logger.log(`✅ Successfully deleted ${keys.length} file(s)`);
	}

	/**
	 * Generate a temporary signed URL for private file access.
	 * Default expiry is 1 hour (3600 seconds).
	 */
	async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
		if (!key) {
			throw new BadRequestException('File key is required');
		}

		return await this.minioClient.presignedGetObject(
			this.bucketName,
			key,
			expiresIn,
		);
	}

	/**
	 * Get permanent public URL for a file.
	 */
	getPublicUrl(key: string): string {
		if (!key) {
			throw new BadRequestException('File key is required');
		}

		return `${this.mediaEndpoint}/${this.bucketName}/${key}`;
	}

	/**
	 * Get public URLs for multiple files.
	 */
	getPublicUrls(keys: string[]): string[] {
		return keys.map((key) => this.getPublicUrl(key));
	}

	/**
	 * Extract object key from a public MinIO/S3 URL.
	 */
	extractKeyFromUrl(url: string): string | null {
		const search = `/${this.bucketName}/`;
		const idx = url.indexOf(search);
		if (idx === -1) return null;
		return url.slice(idx + search.length);
	}

	/**
	 * Centralized file validation.
	 */
	validateFile(file: Express.Multer.File, options?: { maxSize?: number, allowedMimes?: string[] }) {
		const maxSize = options?.maxSize || MediaService.MAX_SIZE_5MB;
		const allowedMimes = options?.allowedMimes || MediaService.ALLOWED_IMAGE_MIMES;

		if (file.size > maxSize) {
			throw new BadRequestException(`File "${file.originalname}" exceeds the size limit.`);
		}

		if (!allowedMimes.includes(file.mimetype)) {
			throw new BadRequestException(
				`Unsupported file type "${file.mimetype}". Allowed: ${allowedMimes.join(', ')}`,
			);
		}
	}

	// ============================================
	// DB INTEGRATION METHODS
	// ============================================

	async uploadSingle(
		file: Express.Multer.File,
		userId: string,
		dto: UploadMediaDto,
	): Promise<MediaEntity> {
		const uploaded = await this.uploadFile(file);

		return this.prisma.media.create({
			data: {
				uploaderId: userId,
				filename: uploaded.key,
				originalName: file.originalname,
				mimeType: file.mimetype,
				size: file.size,
				bucket: this.bucketName,
				url: uploaded.url,
				alt: dto.alt,
			},
		});
	}

	async uploadMultiple(
		files: Express.Multer.File[],
		userId: string,
		dto: UploadMediaDto,
	): Promise<MediaEntity[]> {
		const uploads = await this.uploadFiles(files);

		const createdMedia: MediaEntity[] = [];
		for (let i = 0; i < uploads.length; i++) {
			const upload = uploads[i];
			const file = files[i];
			const result = await this.prisma.media.create({
				data: {
					uploaderId: userId,
					filename: upload.key,
					originalName: file.originalname,
					mimeType: file.mimetype,
					size: file.size,
					bucket: this.bucketName,
					url: upload.url,
					alt: dto.alt,
				},
			});
			createdMedia.push(result);
		}

		return createdMedia;
	}

	async findAllByUser(userId: string, page: number, limit: number): Promise<MediaListEntity> {
		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			this.prisma.media.findMany({
				where: { uploaderId: userId },
				skip,
				take: Number(limit),
				orderBy: { createdAt: 'desc' },
			}),
			this.prisma.media.count({
				where: { uploaderId: userId },
			}),
		]);

		return {
			data,
			total,
			page: Number(page),
			limit: Number(limit),
		};
	}

	async findOne(id: string): Promise<MediaEntity> {
		const media = await this.prisma.media.findUnique({ where: { id } });
		if (!media) throw new NotFoundException('Media not found');
		return media;
	}

	async update(
		id: string,
		userId: string,
		dto: UpdateMediaDto,
		file?: Express.Multer.File,
	): Promise<MediaEntity> {
		const media = await this.prisma.media.findUnique({
			where: { id },
		});

		if (!media) throw new NotFoundException('Media not found');
		if (media.uploaderId !== userId) throw new BadRequestException('Not authorized');

		let updateData: any = { ...dto };

		if (file) {
			const uploaded = await this.uploadFile(file);
			await this.deleteFile(media.filename).catch(() => null);

			updateData = {
				...updateData,
				filename: uploaded.key,
				originalName: file.originalname,
				mimeType: file.mimetype,
				size: file.size,
				url: uploaded.url,
			};
		}

		return this.prisma.media.update({
			where: { id },
			data: updateData,
		});
	}

	async remove(id: string, userId: string): Promise<MediaEntity> {
		const media = await this.prisma.media.findUnique({ where: { id } });
		if (!media) throw new NotFoundException('Media not found');
		if (media.uploaderId !== userId) throw new BadRequestException('Not authorized');

		await this.deleteFile(media.filename).catch(() => null);

		return this.prisma.media.delete({ where: { id } });
	}

	async removeBulk(ids: string[], userId: string): Promise<BulkDeleteResultEntity> {
		const mediaList = await this.prisma.media.findMany({
			where: { id: { in: ids }, uploaderId: userId },
		});

		if (mediaList.length === 0) return { deleted: 0, message: 'No media deleted' };

		const filenames = mediaList.map((m) => m.filename);
		await this.deleteFiles(filenames).catch(() => null);

		const deleteResult = await this.prisma.media.deleteMany({
			where: {
				id: { in: mediaList.map((m) => m.id) },
			},
		});

		return {
			deleted: deleteResult.count,
			message: `Deleted ${deleteResult.count} files successfully`,
		};
	}
}