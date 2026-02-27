import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { MediaService } from "src/media/media.service";
import { CreateHowitworkSectionDto } from "./dto/create-howitwork.dto";
import { UpdateHowitworkSectionDto } from "./dto/update-howitwork.dto";
import { CreateHowitworkStepDto } from "./dto/create-howitwork-step.dto";
import { UpdateStepDto } from "./dto/update-howitwork-step.dto";

@Injectable()
export class HowitworksService {
	private readonly logger = new Logger(HowitworksService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly mediaService: MediaService,
	) { }

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
					if (step.icon) {
						const key = this.mediaService.extractKeyFromUrl(step.icon);
						if (key) await this.mediaService.deleteFile(key);
					}
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
				include: { steps: { orderBy: { order: "asc" } } },
			});
		});
	}

	/** Find all sections with their steps. */
	async findAll() {
		return this.prisma.howItWorksSection.findMany({
			include: {
				steps: {
					orderBy: { order: "asc" },
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
			include: { steps: { orderBy: { order: "asc" } } },
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
			include: { steps: { orderBy: { order: "asc" } } },
		});
	}

	// ── Step CRUD ────────────────────────────────────────────────

	/** Create a step and optionally upload an icon file. */
	async createStep(dto: CreateHowitworkStepDto, file?: Express.Multer.File) {
		this.logger.log(`Creating HowItWorks Step: ${dto.title}`);

		// 1. Upload Icon first (if any)
		let icon = dto.icon;
		if (file) {
			const upload = await this.mediaService.uploadFile(file, "howitworks");
			icon = upload.url;
		}

		// 2. Find ANY existing section (Singleton approach)
		let section = await this.prisma.howItWorksSection.findFirst();

		// 3. Auto-create section if missing
		if (!section) {
			section = await this.prisma.howItWorksSection.create({
				data: {
					title: "How It Works", // Default title
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
			const upload = await this.mediaService.uploadFile(file, "howitworks");
			icon = upload.url;
			// Clean up old icon
			if (existing.icon) {
				const oldKey = this.mediaService.extractKeyFromUrl(existing.icon);
				if (oldKey) await this.mediaService.deleteFile(oldKey);
			}
		}

		// Verify new sectionId if changed
		if (dto.sectionId && dto.sectionId !== existing.sectionId) {
			const section = await this.prisma.howItWorksSection.findUnique({
				where: { id: dto.sectionId },
			});
			if (!section) {
				throw new NotFoundException(`HowItWorks Section "${dto.sectionId}" not found`);
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
		if (step.icon) {
			const key = this.mediaService.extractKeyFromUrl(step.icon);
			if (key) await this.mediaService.deleteFile(key);
		}

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
