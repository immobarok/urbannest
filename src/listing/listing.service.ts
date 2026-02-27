import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from "@nestjs/common";
import { ListingStatus, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MediaService } from "../media/media.service";
import {
	AddListingPhotosDto,
	CreateListingDto,
	ListingQueryDto,
	RejectListingDto,
	UpdateListingDto,
} from "./dto";
import { ListingEntity, ListingListEntity, ListingPhotoEntity } from "./entities";



@Injectable()
export class ListingService {
	private readonly logger = new Logger(ListingService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly mediaService: MediaService,
	) { }

	// ══════════════════════════════════════════════════════
	//  Helpers
	// ══════════════════════════════════════════════════════

	/** Generate a URL-friendly slug from a title. */
	private generateSlug(title: string): string {
		const base = title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
		return `${base}-${randomUUID().slice(0, 8)}`;
	}



	/** Ensure the caller owns the listing and throw if not. */
	private async findOwnedListing(id: string, hostId: string) {
		const listing = await this.prisma.listing.findUnique({ where: { id } });
		if (!listing) {
			throw new NotFoundException(`Listing "${id}" not found.`);
		}
		if (listing.hostId !== hostId) {
			throw new ForbiddenException("You can only manage your own listings.");
		}
		return listing;
	}

	/** Include clause for detail queries. */
	private get detailInclude() {
		return {
			photos: { orderBy: { sortOrder: "asc" as const } },
			host: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					avatarUrl: true,
				},
			},
			amenities: {
				include: { amenity: true },
			},
			houseRules: { orderBy: { sortOrder: "asc" as const } },
		};
	}

	// ══════════════════════════════════════════════════════
	//  HOST – Create
	// ══════════════════════════════════════════════════════

	async create(hostId: string, dto: CreateListingDto): Promise<ListingEntity> {
		const slug = this.generateSlug(dto.title);

		const listing = await this.prisma.listing.create({
			data: {
				hostId,
				title: dto.title,
				description: dto.description,
				propertyType: dto.propertyType,
				roomType: dto.roomType,
				status: ListingStatus.DRAFT,
				address: dto.address,
				city: dto.city,
				state: dto.state,
				country: dto.country,
				zipCode: dto.zipCode,
				latitude: dto.latitude,
				longitude: dto.longitude,
				maxGuests: dto.maxGuests,
				bedrooms: dto.bedrooms,
				bathrooms: dto.bathrooms,
				beds: dto.beds,
				basePrice: dto.basePrice,
				cleaningFee: dto.cleaningFee,
				serviceFeePercent: dto.serviceFeePercent,
				securityDeposit: dto.securityDeposit,
				minNights: dto.minNights,
				maxNights: dto.maxNights,
				cancellationPolicy: dto.cancellationPolicy,
				instantBook: dto.instantBook,
				slug,
				metaTitle: dto.metaTitle,
				metaDescription: dto.metaDescription,
			},
			include: this.detailInclude,
		});

		this.logger.log(`Created listing ${listing.id} by host ${hostId}`);
		return listing as unknown as ListingEntity;
	}

	// ══════════════════════════════════════════════════════
	//  HOST – Update
	// ══════════════════════════════════════════════════════

	async update(id: string, hostId: string, dto: UpdateListingDto): Promise<ListingEntity> {
		await this.findOwnedListing(id, hostId);

		const listing = await this.prisma.listing.update({
			where: { id },
			data: {
				...dto,
				// If the listing was rejected, allow resubmission as draft
				...(dto.title || dto.description
					? { status: ListingStatus.DRAFT, rejectionReason: null }
					: {}),
			},
			include: this.detailInclude,
		});

		this.logger.log(`Updated listing ${id}`);
		return listing as unknown as ListingEntity;
	}

	// ══════════════════════════════════════════════════════
	//  HOST – Submit for Approval
	// ══════════════════════════════════════════════════════

	async submitForApproval(id: string, hostId: string): Promise<ListingEntity> {
		const existing = await this.findOwnedListing(id, hostId);

		if (existing.status !== ListingStatus.DRAFT && existing.status !== ListingStatus.REJECTED) {
			throw new BadRequestException(
				`Listing can only be submitted when in DRAFT or REJECTED status. Current: ${existing.status}`,
			);
		}

		const listing = await this.prisma.listing.update({
			where: { id },
			data: { status: ListingStatus.PENDING_APPROVAL },
			include: this.detailInclude,
		});

		this.logger.log(`Listing ${id} submitted for approval`);
		return listing as unknown as ListingEntity;
	}

	// ══════════════════════════════════════════════════════
	//  HOST – Delete
	// ══════════════════════════════════════════════════════

	async remove(id: string, hostId: string): Promise<ListingEntity> {
		const existing = await this.findOwnedListing(id, hostId);

		// Delete photos from MinIO and Media table
		const photos = await this.prisma.listingPhoto.findMany({
			where: { listingId: id },
		});

		if (photos.length > 0) {
			const filenames = photos
				.map((p) => this.mediaService.extractKeyFromUrl(p.url))
				.filter(Boolean) as string[];

			if (filenames.length > 0) {
				await this.mediaService.deleteFiles(filenames).catch((err) => {
					this.logger.warn(`Failed to delete listing photos from storage`, err);
				});
			}
		}

		await this.prisma.listing.delete({ where: { id } });

		this.logger.log(`Deleted listing ${id}`);
		return existing as unknown as ListingEntity;
	}

	// ══════════════════════════════════════════════════════
	//  HOST – My Listings
	// ══════════════════════════════════════════════════════

	async findMyListings(hostId: string, query: ListingQueryDto): Promise<ListingListEntity> {
		const where = this.buildListingWhere(query);
		where.hostId = hostId;
		if (query.status) where.status = query.status;

		return this.findListingsWithPagination(where, query);
	}

	// ══════════════════════════════════════════════════════
	//  PUBLIC – Browse Active Listings
	// ══════════════════════════════════════════════════════

	async findPublicListings(query: ListingQueryDto): Promise<ListingListEntity> {
		const where = this.buildListingWhere(query);
		where.status = ListingStatus.ACTIVE;

		return this.findListingsWithPagination(where, query);
	}

	// ══════════════════════════════════════════════════════
	//  PUBLIC – View Single Listing
	// ══════════════════════════════════════════════════════

	async findOne(id: string): Promise<ListingEntity> {
		const listing = await this.prisma.listing.findUnique({
			where: { id },
			include: this.detailInclude,
		});
		if (!listing) {
			throw new NotFoundException(`Listing "${id}" not found.`);
		}
		return listing as unknown as ListingEntity;
	}

	/** Find all unique cities with active listings. */
	async findCities(): Promise<string[]> {
		const cities = await this.prisma.listing.findMany({
			where: { status: ListingStatus.ACTIVE },
			select: { city: true },
			distinct: ["city"],
			orderBy: { city: "asc" },
		});
		return cities.map((c) => c.city);
	}

	/** Find a listing by its slug (public). */
	async findBySlug(slug: string): Promise<ListingEntity> {
		const listing = await this.prisma.listing.findUnique({
			where: { slug },
			include: this.detailInclude,
		});
		if (!listing) {
			throw new NotFoundException(`Listing with slug "${slug}" not found.`);
		}
		return listing as unknown as ListingEntity;
	}

	// ══════════════════════════════════════════════════════
	//  ADMIN – Approve
	// ══════════════════════════════════════════════════════

	async approve(id: string, adminId: string): Promise<ListingEntity> {
		const listing = await this.prisma.listing.findUnique({ where: { id } });
		if (!listing) {
			throw new NotFoundException(`Listing "${id}" not found.`);
		}
		if (listing.status !== ListingStatus.PENDING_APPROVAL) {
			throw new BadRequestException(
				`Only PENDING_APPROVAL listings can be approved. Current: ${listing.status}`,
			);
		}

		const updated = await this.prisma.listing.update({
			where: { id },
			data: {
				status: ListingStatus.ACTIVE,
				approvedById: adminId,
				approvedAt: new Date(),
				rejectionReason: null,
			},
			include: this.detailInclude,
		});

		this.logger.log(`Listing ${id} approved by admin ${adminId}`);
		return updated as unknown as ListingEntity;
	}

	// ══════════════════════════════════════════════════════
	//  ADMIN – Reject
	// ══════════════════════════════════════════════════════

	async reject(id: string, adminId: string, dto: RejectListingDto): Promise<ListingEntity> {
		const listing = await this.prisma.listing.findUnique({ where: { id } });
		if (!listing) {
			throw new NotFoundException(`Listing "${id}" not found.`);
		}
		if (listing.status !== ListingStatus.PENDING_APPROVAL) {
			throw new BadRequestException(
				`Only PENDING_APPROVAL listings can be rejected. Current: ${listing.status}`,
			);
		}

		const updated = await this.prisma.listing.update({
			where: { id },
			data: {
				status: ListingStatus.REJECTED,
				approvedById: adminId,
				rejectionReason: dto.reason,
			},
			include: this.detailInclude,
		});

		this.logger.log(`Listing ${id} rejected by admin ${adminId}`);
		return updated as unknown as ListingEntity;
	}

	// ══════════════════════════════════════════════════════
	//  ADMIN – Browse All Listings
	// ══════════════════════════════════════════════════════

	async findAllAdmin(query: ListingQueryDto): Promise<ListingListEntity> {
		const where = this.buildListingWhere(query);
		if (query.status) where.status = query.status;

		return this.findListingsWithPagination(where, query);
	}

	// ══════════════════════════════════════════════════════
	//  PHOTOS – Upload Single
	// ══════════════════════════════════════════════════════

	async addPhoto(
		listingId: string,
		hostId: string,
		file: Express.Multer.File,
		dto: AddListingPhotosDto,
	): Promise<ListingPhotoEntity> {
		if (!file) {
			throw new BadRequestException("No file provided.");
		}
		await this.findOwnedListing(listingId, hostId);

		// Use MediaService to handle upload and DB record creation
		const media = await this.mediaService.uploadSingle(file, hostId, {
			alt: dto.caption,
		});

		// If setting as cover, unset any existing cover
		if (dto.isCover) {
			await this.prisma.listingPhoto.updateMany({
				where: { listingId, isCover: true },
				data: { isCover: false },
			});
		}

		const photo = await this.prisma.listingPhoto.create({
			data: {
				listingId,
				url: media.url,
				caption: dto.caption ?? null,
				isCover: dto.isCover ?? false,
				sortOrder: dto.sortOrder ?? 0,
			},
		});

		this.logger.log(`Added photo ${photo.id} to listing ${listingId}`);
		return photo as unknown as ListingPhotoEntity;
	}

	// ══════════════════════════════════════════════════════
	//  PHOTOS – Upload Multiple
	// ══════════════════════════════════════════════════════

	async addPhotos(
		listingId: string,
		hostId: string,
		files: Express.Multer.File[],
		dto: AddListingPhotosDto,
	): Promise<ListingPhotoEntity[]> {
		if (!files || files.length === 0) {
			throw new BadRequestException("No files provided.");
		}
		await this.findOwnedListing(listingId, hostId);

		// Use MediaService to handle bulk upload
		const mediaEntities = await this.mediaService.uploadMultiple(files, hostId, {
			alt: dto.caption,
		});

		const results: ListingPhotoEntity[] = [];

		for (let i = 0; i < mediaEntities.length; i++) {
			const media = mediaEntities[i];

			const photo = await this.prisma.listingPhoto.create({
				data: {
					listingId,
					url: media.url,
					caption: dto.caption ?? null,
					isCover: i === 0 && (dto.isCover ?? false),
					sortOrder: (dto.sortOrder ?? 0) + i,
				},
			});

			results.push(photo as unknown as ListingPhotoEntity);
		}

		this.logger.log(`Added ${results.length} photo(s) to listing ${listingId}`);
		return results;
	}

	// ══════════════════════════════════════════════════════
	//  PHOTOS – Delete
	// ══════════════════════════════════════════════════════

	async removePhoto(
		listingId: string,
		photoId: string,
		hostId: string,
	): Promise<ListingPhotoEntity> {
		await this.findOwnedListing(listingId, hostId);

		const photo = await this.prisma.listingPhoto.findFirst({
			where: { id: photoId, listingId },
		});
		if (!photo) {
			throw new NotFoundException(`Photo "${photoId}" not found on this listing.`);
		}

		await this.prisma.listingPhoto.delete({ where: { id: photoId } });

		// Delete from storage
		const key = this.mediaService.extractKeyFromUrl(photo.url);
		if (key) {
			this.mediaService.deleteFile(key).catch((err) => {
				this.logger.warn(`Failed to delete photo object: ${key}`, err);
			});
		}

		this.logger.log(`Deleted photo ${photoId} from listing ${listingId}`);
		return photo as unknown as ListingPhotoEntity;
	}

	// ══════════════════════════════════════════════════════
	//  Private Helpers
	// ══════════════════════════════════════════════════════

	/** Shared filter builder for public, host, and admin listing queries. */
	private buildListingWhere(query: ListingQueryDto): Prisma.ListingWhereInput {
		const where: Prisma.ListingWhereInput = {};

		if (query.search) {
			where.OR = [
				{ title: { contains: query.search, mode: "insensitive" } },
				{ description: { contains: query.search, mode: "insensitive" } },
				{ city: { contains: query.search, mode: "insensitive" } },
			];
		}

		if (query.city) {
			where.city = { contains: query.city, mode: "insensitive" };
		}
		if (query.country) {
			where.country = { contains: query.country, mode: "insensitive" };
		}
		if (query.propertyType) {
			where.propertyType = query.propertyType;
		}
		if (query.roomType) {
			where.roomType = query.roomType;
		}

		if (query.amenities && query.amenities.length > 0) {
			const amenityFilters = query.amenities.map((name) => ({
				amenities: {
					some: {
						amenity: {
							name: { equals: name, mode: "insensitive" as const },
						},
					},
				},
			}));

			const currentAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];

			where.AND = [...currentAnd, ...amenityFilters] as Prisma.ListingWhereInput[];
		}

		if (query.guests) {
			where.maxGuests = { gte: query.guests };
		}
		if (query.bedrooms) {
			where.bedrooms = { gte: query.bedrooms };
		}
		if (query.bathrooms) {
			where.bathrooms = { gte: query.bathrooms };
		}

		if (query.minPrice || query.maxPrice) {
			where.basePrice = {};
			if (query.minPrice) (where.basePrice as any).gte = query.minPrice;
			if (query.maxPrice) (where.basePrice as any).lte = query.maxPrice;
		}

		return where;
	}



	/** Shared pagination helper. */
	private async findListingsWithPagination(
		where: Prisma.ListingWhereInput,
		query: ListingQueryDto,
	): Promise<ListingListEntity> {
		const page = query.page ?? 1;
		const limit = query.limit ?? 20;
		const skip = (page - 1) * limit;

		let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: "desc" };
		switch (query.sortBy) {
			case "price":
				orderBy = { basePrice: "asc" };
				break;
			case "rating":
				orderBy = { averageRating: "desc" };
				break;
			case "guests":
				orderBy = { maxGuests: "desc" };
				break;
			case "newest":
			default:
				orderBy = { createdAt: "desc" };
		}

		const [data, total] = await Promise.all([
			this.prisma.listing.findMany({
				where,
				orderBy,
				skip,
				take: limit,
				include: {
					photos: { orderBy: { sortOrder: "asc" }, take: 1 }, // cover only
					host: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							avatarUrl: true,
						},
					},
				},
			}),
			this.prisma.listing.count({ where }),
		]);

		return {
			data: data as unknown as ListingEntity[],
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		};
	}
}
