import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ListingStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio';
import {
  AddListingPhotosDto,
  CreateListingDto,
  ListingQueryDto,
  RejectListingDto,
  UpdateListingDto,
} from './dto';
import {
  ListingEntity,
  ListingListEntity,
  ListingPhotoEntity,
} from './entities';

/** Allowed image MIME types */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
];

/** 5 MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class ListingService {
  private readonly logger = new Logger(ListingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  // ══════════════════════════════════════════════════════
  //  Helpers
  // ══════════════════════════════════════════════════════

  /** Generate a URL-friendly slug from a title. */
  private generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${base}-${randomUUID().slice(0, 8)}`;
  }

  /** Validate a single image file. */
  private validateImageFile(file: Express.Multer.File): void {
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

  /** Generate a unique MinIO object key for a listing photo. */
  private generatePhotoKey(originalName: string): string {
    const ext = extname(originalName).toLowerCase();
    const date = new Date();
    const folder = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    return `listings/${folder}/${randomUUID()}${ext}`;
  }

  /** Ensure the caller owns the listing and throw if not. */
  private async findOwnedListing(id: string, hostId: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      throw new NotFoundException(`Listing "${id}" not found.`);
    }
    if (listing.hostId !== hostId) {
      throw new ForbiddenException('You can only manage your own listings.');
    }
    return listing;
  }

  /** Include clause for detail queries. */
  private get detailInclude() {
    return {
      photos: { orderBy: { sortOrder: 'asc' as const } },
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
      houseRules: { orderBy: { sortOrder: 'asc' as const } },
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

  async update(
    id: string,
    hostId: string,
    dto: UpdateListingDto,
  ): Promise<ListingEntity> {
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

    if (
      existing.status !== ListingStatus.DRAFT &&
      existing.status !== ListingStatus.REJECTED
    ) {
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

    // Delete photos from MinIO
    const photos = await this.prisma.listingPhoto.findMany({
      where: { listingId: id },
    });
    if (photos.length > 0) {
      const keys = photos
        .map((p) => this.extractObjectKey(p.url))
        .filter(Boolean) as string[];
      if (keys.length > 0) {
        this.minio.deleteMany(keys).catch((err) => {
          this.logger.warn(`Failed to delete listing photos from MinIO`, err);
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

  async findMyListings(
    hostId: string,
    query: ListingQueryDto,
  ): Promise<ListingListEntity> {
    const where: Prisma.ListingWhereInput = { hostId };
    if (query.status) where.status = query.status;

    return this.findListingsWithPagination(where, query);
  }

  // ══════════════════════════════════════════════════════
  //  PUBLIC – Browse Active Listings
  // ══════════════════════════════════════════════════════

  async findPublicListings(query: ListingQueryDto): Promise<ListingListEntity> {
    const where: Prisma.ListingWhereInput = {
      status: ListingStatus.ACTIVE,
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.country)
      where.country = { contains: query.country, mode: 'insensitive' };
    if (query.propertyType) where.propertyType = query.propertyType;
    if (query.guests) where.maxGuests = { gte: query.guests };
    if (query.bedrooms) where.bedrooms = { gte: query.bedrooms };
    if (query.bathrooms) where.bathrooms = { gte: query.bathrooms };
    if (query.minPrice || query.maxPrice) {
      where.basePrice = {};
      if (query.minPrice) (where.basePrice as any).gte = query.minPrice;
      if (query.maxPrice) (where.basePrice as any).lte = query.maxPrice;
    }

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

  async reject(
    id: string,
    adminId: string,
    dto: RejectListingDto,
  ): Promise<ListingEntity> {
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
    const where: Prisma.ListingWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

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
      throw new BadRequestException('No file provided.');
    }
    await this.findOwnedListing(listingId, hostId);
    this.validateImageFile(file);

    const objectKey = this.generatePhotoKey(file.originalname);
    await this.minio.upload(objectKey, file.buffer, file.size, file.mimetype);
    const url = this.minio.getObjectUrl(objectKey);

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
        url,
        caption: dto.caption ?? null,
        isCover: dto.isCover ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    this.logger.log(`Added photo ${photo.id} to listing ${listingId}`);
    return photo;
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
      throw new BadRequestException('No files provided.');
    }
    await this.findOwnedListing(listingId, hostId);

    for (const file of files) {
      this.validateImageFile(file);
    }

    const results: ListingPhotoEntity[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const objectKey = this.generatePhotoKey(file.originalname);
      await this.minio.upload(objectKey, file.buffer, file.size, file.mimetype);
      const url = this.minio.getObjectUrl(objectKey);

      const photo = await this.prisma.listingPhoto.create({
        data: {
          listingId,
          url,
          caption: dto.caption ?? null,
          isCover: i === 0 && (dto.isCover ?? false),
          sortOrder: (dto.sortOrder ?? 0) + i,
        },
      });

      results.push(photo);
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
      throw new NotFoundException(
        `Photo "${photoId}" not found on this listing.`,
      );
    }

    await this.prisma.listingPhoto.delete({ where: { id: photoId } });

    // Delete from MinIO
    const key = this.extractObjectKey(photo.url);
    if (key) {
      this.minio.delete(key).catch((err) => {
        this.logger.warn(`Failed to delete photo object: ${key}`, err);
      });
    }

    this.logger.log(`Deleted photo ${photoId} from listing ${listingId}`);
    return photo;
  }

  // ══════════════════════════════════════════════════════
  //  Private Helpers
  // ══════════════════════════════════════════════════════

  /** Extract the object key from a MinIO URL. */
  private extractObjectKey(url: string): string | null {
    const bucket = this.minio.getBucket();
    const idx = url.indexOf(`/${bucket}/`);
    if (idx === -1) return null;
    return url.slice(idx + bucket.length + 2);
  }

  /** Shared pagination helper. */
  private async findListingsWithPagination(
    where: Prisma.ListingWhereInput,
    query: ListingQueryDto,
  ): Promise<ListingListEntity> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    let orderBy: Prisma.ListingOrderByWithRelationInput = { createdAt: 'desc' };
    switch (query.sortBy) {
      case 'price':
        orderBy = { basePrice: 'asc' };
        break;
      case 'rating':
        orderBy = { averageRating: 'desc' };
        break;
      case 'guests':
        orderBy = { maxGuests: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    const [data, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          photos: { orderBy: { sortOrder: 'asc' }, take: 1 }, // cover only
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
