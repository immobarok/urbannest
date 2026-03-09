import { CancellationPolicyType, PropertyType, RoomType } from "@prisma/client";
import { Type } from "class-transformer";
import {
	IsBoolean,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
	MinLength,
	IsArray,
} from "class-validator";

export class CreateListingDto {
	@IsString()
	@IsNotEmpty()
	@MinLength(5)
	@MaxLength(150)
	title!: string;

	@IsString()
	@IsNotEmpty()
	@MinLength(20)
	@MaxLength(5000)
	description!: string;

	@IsEnum(PropertyType)
	propertyType!: PropertyType;

	@IsEnum(RoomType)
	roomType!: RoomType;

	// ── Location ─────────────────────────────────────────

	@IsString()
	@IsNotEmpty()
	address!: string;

	@IsString()
	@IsNotEmpty()
	city!: string;

	@IsString()
	@IsNotEmpty()
	state!: string;

	@IsString()
	@IsNotEmpty()
	country!: string;

	@IsString()
	@IsNotEmpty()
	zipCode!: string;

	@IsOptional()
	@IsNumber()
	@Type(() => Number)
	latitude?: number;

	@IsOptional()
	@IsNumber()
	@Type(() => Number)
	longitude?: number;

	// ── Capacity ─────────────────────────────────────────

	@IsInt()
	@Min(1)
	@Max(50)
	@Type(() => Number)
	maxGuests!: number;

	@IsInt()
	@Min(0)
	@Max(50)
	@Type(() => Number)
	bedrooms!: number;

	@IsNumber()
	@Min(0)
	@Max(50)
	@Type(() => Number)
	bathrooms!: number;

	@IsInt()
	@Min(0)
	@Max(100)
	@Type(() => Number)
	beds!: number;

	// ── Pricing ──────────────────────────────────────────

	@IsNumber()
	@Min(1)
	@Type(() => Number)
	basePrice!: number;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Type(() => Number)
	cleaningFee?: number;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(50)
	@Type(() => Number)
	serviceFeePercent?: number;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Type(() => Number)
	securityDeposit?: number;

	// ── Stay limits ──────────────────────────────────────

	@IsOptional()
	@IsInt()
	@Min(1)
	@Type(() => Number)
	minNights?: number;

	@IsOptional()
	@IsInt()
	@Min(1)
	@Type(() => Number)
	maxNights?: number;

	// ── Booking policy ───────────────────────────────────

	@IsOptional()
	@IsEnum(CancellationPolicyType)
	cancellationPolicy?: CancellationPolicyType;

	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	instantBook?: boolean;

	// ── SEO ──────────────────────────────────────────────

	@IsOptional()
	@IsString()
	@MaxLength(160)
	metaTitle?: string;

	@IsOptional()
	@IsString()
	@MaxLength(320)
	metaDescription?: string;

	// ── Relations ────────────────────────────────────────

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Type(() => String)
	amenityIds?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@Type(() => String)
	houseRules?: string[];
}
