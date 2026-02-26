import { CancellationPolicyType, ListingStatus, PropertyType, RoomType } from "@prisma/client";

// ── Listing Photo ──────────────────────────────────────

export class ListingPhotoEntity {
	id!: string;
	listingId!: string;
	url!: string;
	caption!: string | null;
	isCover!: boolean;
	sortOrder!: number;
	createdAt!: Date;
}

// ── Listing ────────────────────────────────────────────

export class ListingEntity {
	id!: string;
	hostId!: string;
	title!: string;
	description!: string;
	propertyType!: PropertyType;
	roomType!: RoomType;
	status!: ListingStatus;

	address!: string;
	city!: string;
	state!: string;
	country!: string;
	zipCode!: string;
	latitude!: number | null;
	longitude!: number | null;

	maxGuests!: number;
	bedrooms!: number;
	bathrooms!: number;
	beds!: number;

	basePrice!: unknown;
	cleaningFee!: unknown;
	serviceFeePercent!: number;
	securityDeposit!: unknown;

	minNights!: number;
	maxNights!: number | null;

	cancellationPolicy!: CancellationPolicyType;
	instantBook!: boolean;

	slug!: string;
	metaTitle!: string | null;
	metaDescription!: string | null;

	approvedById!: string | null;
	approvedAt!: Date | null;
	rejectionReason!: string | null;

	averageRating!: number | null;
	reviewCount!: number;

	createdAt!: Date;
	updatedAt!: Date;

	// Included relations (optional – populated on detail queries)
	photos?: ListingPhotoEntity[];
	host?: {
		id: string;
		firstName: string;
		lastName: string;
		avatarUrl: string | null;
	};
}

// ── List Response ──────────────────────────────────────

export class ListingListEntity {
	data!: ListingEntity[];
	total!: number;
	page!: number;
	limit!: number;
	totalPages!: number;
}

// ── Bulk Delete ────────────────────────────────────────

export class ListingBulkDeleteResultEntity {
	deleted!: number;
	message!: string;
}
