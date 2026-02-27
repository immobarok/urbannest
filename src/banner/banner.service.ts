import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBannerDto } from "./dto/create-banner.dto";
import { UpdateBannerDto } from "./dto/update-banner.dto";
import { MediaService } from "../media/media.service";

@Injectable()
export class BannerService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly mediaService: MediaService,
	) {}

	async uploadImage(file: Express.Multer.File, userId: string) {
		// Delegates to MediaService for consistent file handling
		return this.mediaService.uploadSingle(file, userId, { alt: "Banner Image" });
	}

	async create(createBannerDto: CreateBannerDto) {
		return this.prisma.banner.create({
			data: createBannerDto,
		});
	}

	async findAll() {
		return this.prisma.banner.findMany({
			orderBy: {
				createdAt: "desc",
			},
		});
	}

	async findOne(id: number) {
		const banner = await this.prisma.banner.findUnique({
			where: { id },
		});

		if (!banner) {
			throw new NotFoundException(`Banner with ID ${id} not found`);
		}

		return banner;
	}

	async findBySlug(pageSlug: string) {
		const banner = await this.prisma.banner.findUnique({
			where: { pageSlug },
		});

		if (!banner) {
			throw new NotFoundException(`Banner for page slug ${pageSlug} not found`);
		}

		return banner;
	}

	async update(id: number, updateBannerDto: UpdateBannerDto) {
		try {
			return await this.prisma.banner.update({
				where: { id },
				data: updateBannerDto,
			});
		} catch {
			throw new NotFoundException(`Banner with ID ${id} not found`);
		}
	}

	async remove(id: number) {
		try {
			return await this.prisma.banner.delete({
				where: { id },
			});
		} catch {
			throw new NotFoundException(`Banner with ID ${id} not found`);
		}
	}
}
