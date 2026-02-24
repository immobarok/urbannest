import {
	BadRequestException,
	ConflictException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { extname } from "path";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";
import { MinioService } from "../minio/minio.service";

/** Allowed image MIME types */
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

/** 2 MB in bytes */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

@Injectable()
export class BrandsService {
	private readonly logger = new Logger(BrandsService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly minio: MinioService,
	) {}

	/** Generate a unique object key for a brand logo. */
	private generateLogoKey(originalName: string): string {
		const ext = extname(originalName).toLowerCase();
		const date = new Date();
		const folder = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}`;
		return `brands/${folder}/${randomUUID()}${ext}`;
	}

	/** Validate file type and size */
	private validateFile(file: Express.Multer.File): void {
		if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
			throw new BadRequestException(
				`Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
			);
		}
		if (file.size > MAX_FILE_SIZE) {
			throw new BadRequestException(`File "${file.originalname}" exceeds the 2 MB limit.`);
		}
	}

	async create(userId: string, dto: CreateBrandDto, file?: Express.Multer.File) {
		const existing = await this.prisma.brands.findUnique({
			where: { name: dto.name },
		});
		if (existing) {
			throw new ConflictException(`Brand with name "${dto.name}" already exists.`);
		}

		let logoUrl = dto.logoUrl;

		if (file) {
			this.validateFile(file);
			const objectKey = this.generateLogoKey(file.originalname);
			await this.minio.upload(objectKey, file.buffer, file.size, file.mimetype);
			logoUrl = this.minio.getObjectUrl(objectKey);
		}

		const brand = await this.prisma.brands.create({
			data: {
				...dto,
				...(logoUrl && { logoUrl }),
				userId: userId,
			},
			// include: {
			//   user: {
			//     select: {
			//       id: true,
			//       firstName: true,
			//       lastName: true,
			//       email: true,
			//     },
			//   },
			// },
		});

		this.logger.log(`Brand "${brand.name}" created by Admin ${userId}`);
		return brand;
	}

	async findAll() {
		return await this.prisma.brands.findMany({
			orderBy: { name: "asc" },
			// include: {
			//   user: {
			//     select: {
			//       id: true,
			//       firstName: true,
			//       lastName: true,
			//       email: true,
			//     },
			//   },
			// },
		});
	}

	async findOne(id: string) {
		const brand = await this.prisma.brands.findUnique({
			where: { id },
			// include: {
			//   user: {
			//     select: {
			//       id: true,
			//       firstName: true,
			//       lastName: true,
			//       email: true,
			//     },
			//   },
			// },
		});
		if (!brand) {
			throw new NotFoundException(`Brand with id "${id}" not found.`);
		}
		return brand;
	}

	async update(id: string, dto: UpdateBrandDto, file?: Express.Multer.File) {
		// Check if brand exists
		await this.findOne(id);

		let logoUrl = dto.logoUrl;

		// Handle file upload if provided
		if (file) {
			this.validateFile(file);
			const objectKey = this.generateLogoKey(file.originalname);
			await this.minio.upload(objectKey, file.buffer, file.size, file.mimetype);
			logoUrl = this.minio.getObjectUrl(objectKey);
		}

		try {
			const updated = await this.prisma.brands.update({
				where: { id },
				data: {
					...dto,
					...(logoUrl && { logoUrl }),
				},
			});
			this.logger.log(`Brand "${id}" updated.`);
			return updated;
		} catch (error) {
			if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
				throw new ConflictException(`Brand with name already exists.`);
			}
			throw error;
		}
	}

	async remove(id: string) {
		const existing = await this.findOne(id);
		await this.prisma.brands.delete({ where: { id } });
		this.logger.log(`Brand "${id}" (${existing.name}) deleted.`);
		return { message: `Brand "${existing.name}" successfully deleted.` };
	}
}
