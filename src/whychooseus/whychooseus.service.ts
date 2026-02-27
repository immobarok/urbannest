import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { MediaService } from "src/media/media.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { CreateCardDto } from "./dto/create-card.dto";
import { UpdateCardDto } from "./dto/update-card.dto";

@Injectable()
export class WhychooseusService {
	private readonly logger = new Logger(WhychooseusService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly mediaService: MediaService,
	) { }

	// ── Section Management ────────────────────────────────────────────────

	async createSection(dto: CreateSectionDto) {
		this.logger.log(`Creating WhyChooseUs Section: ${JSON.stringify(dto)}`);
		return this.prisma.whyChooseSection.create({
			data: {
				header: dto.header,
				headerHighlight: dto.headerHighlight,
				subHeader: dto.subHeader,
			},
			include: { cards: true },
		});
	}

	async findAllSections() {
		return this.prisma.whyChooseSection.findMany({
			include: {
				cards: {
					orderBy: { sortOrder: "asc" },
				},
			},
			orderBy: { id: "asc" },
		});
	}

	async findOneSection(id: number) {
		const section = await this.prisma.whyChooseSection.findUnique({
			where: { id },
			include: {
				cards: {
					orderBy: { sortOrder: "asc" },
				},
			},
		});

		if (!section) {
			throw new NotFoundException(`WhyChooseUs Section with ID ${id} not found`);
		}
		return section;
	}

	async updateSection(id: number, dto: UpdateSectionDto) {
		await this.findOneSection(id); // Ensure exists

		return this.prisma.whyChooseSection.update({
			where: { id },
			data: {
				header: dto.header,
				headerHighlight: dto.headerHighlight,
				subHeader: dto.subHeader,
			},
			include: { cards: true },
		});
	}

	async removeSection(id: number) {
		const section = await this.findOneSection(id);

		// Clean up card icons
		for (const card of section.cards) {
			if (card.iconUrl) {
				const key = this.mediaService.extractKeyFromUrl(card.iconUrl);
				if (key) await this.mediaService.deleteFile(key);
			}
		}

		return this.prisma.whyChooseSection.delete({
			where: { id },
		});
	}

	// ── Card Management ───────────────────────────────────────────────────

	async createCard(sectionId: number, dto: CreateCardDto, file?: Express.Multer.File) {
		this.logger.log(`Creating Card for Section ${sectionId}`);

		// Ensure section exists
		const section = await this.prisma.whyChooseSection.findUnique({
			where: { id: sectionId },
		});
		if (!section) {
			throw new NotFoundException(`Section with ID ${sectionId} not found`);
		}

		let iconUrl: string | undefined;
		if (file) {
			const upload = await this.mediaService.uploadFile(file, "whychooseus");
			iconUrl = upload.url;
		}

		return this.prisma.whyChooseCard.create({
			data: {
				title: dto.title,
				description: dto.description,
				iconAlt: dto.iconAlt,
				sortOrder: dto.sortOrder ?? 0,
				iconUrl,
				sectionId,
			},
		});
	}

	async updateCard(id: number, dto: UpdateCardDto, file?: Express.Multer.File) {
		const card = await this.prisma.whyChooseCard.findUnique({ where: { id } });
		if (!card) {
			throw new NotFoundException(`Card with ID ${id} not found`);
		}

		let iconUrl = card.iconUrl;
		if (file) {
			// Upload new file
			const upload = await this.mediaService.uploadFile(file, "whychooseus");
			const newIconUrl = upload.url;
			// Delete old file
			if (card.iconUrl) {
				const oldKey = this.mediaService.extractKeyFromUrl(card.iconUrl);
				if (oldKey) await this.mediaService.deleteFile(oldKey);
			}
			iconUrl = newIconUrl;
		}

		return this.prisma.whyChooseCard.update({
			where: { id },
			data: {
				title: dto.title,
				description: dto.description,
				iconAlt: dto.iconAlt,
				sortOrder: dto.sortOrder,
				iconUrl: iconUrl ?? undefined,
			},
		});
	}

	async removeCard(id: number) {
		const card = await this.prisma.whyChooseCard.findUnique({ where: { id } });
		if (!card) {
			throw new NotFoundException(`Card with ID ${id} not found`);
		}

		if (card.iconUrl) {
			const key = this.mediaService.extractKeyFromUrl(card.iconUrl);
			if (key) await this.mediaService.deleteFile(key);
		}

		return this.prisma.whyChooseCard.delete({ where: { id } });
	}

	async findAllCards(sectionId: number) {
		return this.prisma.whyChooseCard.findMany({
			where: { sectionId },
			orderBy: { sortOrder: "asc" },
		});
	}
}
