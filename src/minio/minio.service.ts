import { BadRequestException, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Minio from "minio";
import { Readable } from "stream";
import { extname } from "path";
import { randomUUID } from "crypto";

@Injectable()
export class MinioService implements OnModuleInit {
	private readonly logger = new Logger(MinioService.name);
	private client: Minio.Client;
	private bucket: string;

	constructor(private readonly config: ConfigService) {
		this.client = new Minio.Client({
			endPoint: this.config.get<string>("MINIO_ENDPOINT", "localhost"),
			port: this.config.get<number>("MINIO_PORT", 9000),
			useSSL: this.config.get<string>("MINIO_USE_SSL", "false") === "true",
			accessKey: this.config.get<string>("MINIO_ACCESS_KEY", "minioadmin"),
			secretKey: this.config.get<string>("MINIO_SECRET_KEY", "minioadmin"),
		});

		this.bucket = this.config.get<string>("MINIO_BUCKET", "urbannest");
	}

	async onModuleInit() {
		await this.ensureBucket();
	}

	/** Create the default bucket if it doesn't exist and set public read policy. */
	private async ensureBucket(): Promise<void> {
		const exists = await this.client.bucketExists(this.bucket);
		if (!exists) {
			await this.client.makeBucket(this.bucket);
			this.logger.log(`Created MinIO bucket: ${this.bucket}`);

			// Allow public read so URLs work without pre-signing
			const policy = {
				Version: "2012-10-17",
				Statement: [
					{
						Effect: "Allow",
						Principal: { AWS: ["*"] },
						Action: ["s3:GetObject"],
						Resource: [`arn:aws:s3:::${this.bucket}/*`],
					},
				],
			};
			await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
			this.logger.log(`Set public-read policy on bucket: ${this.bucket}`);
		} else {
			this.logger.log(`MinIO bucket already exists: ${this.bucket}`);
		}
	}

	/** Get the bucket name. */
	getBucket(): string {
		return this.bucket;
	}

	/**
	 * Upload a file buffer to MinIO.
	 * @returns The object key (filename) in the bucket.
	 */
	async upload(
		objectName: string,
		buffer: Buffer,
		size: number,
		mimeType: string,
	): Promise<void> {
		await this.client.putObject(this.bucket, objectName, buffer, size, {
			"Content-Type": mimeType,
		});
		this.logger.debug(`Uploaded object: ${objectName} (${size} bytes)`);
	}

	/** Delete a single object from MinIO. */
	async delete(objectName: string): Promise<void> {
		await this.client.removeObject(this.bucket, objectName);
		this.logger.debug(`Deleted object: ${objectName}`);
	}

	/** Delete multiple objects from MinIO. */
	async deleteMany(objectNames: string[]): Promise<void> {
		await this.client.removeObjects(this.bucket, objectNames);
		this.logger.debug(`Deleted ${objectNames.length} object(s)`);
	}

	/** Generate a unique object key preserving the original extension. */
	private generateUniqueKey(originalName: string, folder: string): string {
		const ext = extname(originalName).toLowerCase();
		const date = new Date();
		const dateParam = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
		return `${folder}/${dateParam}/${randomUUID()}${ext}`;
	}

	/** Extract the Minio object key from a full URL. Returns null if not a minio URL. */
	extractObjectKey(url: string): string | null {
		const bucket = this.getBucket();
		const marker = `/${bucket}/`;
		const idx = url.indexOf(marker);
		if (idx === -1) return null;
		return url.substring(idx + marker.length);
	}

	/** Safely delete an old file from Minio (best-effort, won't throw). */
	async deleteFile(fileUrl: string | null | undefined): Promise<void> {
		if (!fileUrl) return;
		const objectKey = this.extractObjectKey(fileUrl);
		if (!objectKey) return;
		try {
			await this.delete(objectKey);
			this.logger.debug(`Deleted old file: ${objectKey}`);
		} catch (error) {
			this.logger.warn(`Failed to delete old file ${objectKey}: ${error}`);
		}
	}

	/** Upload a file to Minio and return the public URL. */
	async uploadFile(
		file: Express.Multer.File,
		folder: string,
		allowedMimeTypes: string[] = [
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/webp",
			"image/svg+xml",
		],
		maxSize: number = 2 * 1024 * 1024,
	): Promise<string> {
		this.validateFile(file, allowedMimeTypes, maxSize);
		const objectKey = this.generateUniqueKey(file.originalname, folder);
		await this.upload(objectKey, file.buffer, file.size, file.mimetype);
		return this.getObjectUrl(objectKey);
	}

	/** Validate a single file for MIME type and size. */
	validateFile(file: Express.Multer.File, allowedMimeTypes: string[], maxSize: number): void {
		if (!allowedMimeTypes.includes(file.mimetype)) {
			throw new BadRequestException(
				`Unsupported file type "${file.mimetype}". Allowed: ${allowedMimeTypes.join(", ")}`,
			);
		}
		if (file.size > maxSize) {
			throw new BadRequestException(`File "${file.originalname}" exceeds the limit.`);
		}
	}

	/** Get a readable stream for an object. */
	async getObject(objectName: string): Promise<Readable> {
		return this.client.getObject(this.bucket, objectName);
	}

	/**
	 * Build the public URL for an object.
	 * For local dev MinIO the URL is: http://localhost:9000/bucket/key
	 */
	getObjectUrl(objectName: string): string {
		const endpoint = this.config.get<string>("MINIO_ENDPOINT", "localhost");
		const port = this.config.get<number>("MINIO_PORT", 9000);
		const ssl = this.config.get<string>("MINIO_USE_SSL", "false") === "true";
		const protocol = ssl ? "https" : "http";

		// If a custom public URL is set (e.g. behind a CDN / proxy), use it
		const publicUrl = this.config.get<string>("MINIO_PUBLIC_URL", "");
		if (publicUrl) {
			return `${publicUrl}/${this.bucket}/${objectName}`;
		}

		return `${protocol}://${endpoint}:${port}/${this.bucket}/${objectName}`;
	}

	/** Generate a pre-signed URL (for private buckets). */
	async getPresignedUrl(objectName: string, expirySeconds = 3600): Promise<string> {
		return this.client.presignedGetObject(this.bucket, objectName, expirySeconds);
	}
}
