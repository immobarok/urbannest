import { Type } from "class-transformer";
import {
	IsBoolean,
	IsDate,
	IsEmail,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Min,
} from "class-validator";

export class CreateBookingDto {
	@IsString()
	@IsNotEmpty()
	listingId!: string;

	@IsDate()
	@Type(() => Date)
	@IsNotEmpty()
	checkIn!: Date;

	@IsDate()
	@Type(() => Date)
	@IsNotEmpty()
	checkOut!: Date;

	@IsInt()
	@Min(1)
	guestCount!: number;

	@IsString()
	@IsNotEmpty()
	firstName!: string;

	@IsString()
	@IsNotEmpty()
	lastName!: string;

	@IsEmail()
	@IsNotEmpty()
	email!: string;

	@IsString()
	@IsNotEmpty()
	phone!: string;

	@IsDate()
	@Type(() => Date)
	@IsOptional()
	dob?: Date;

	@IsString()
	@IsOptional()
	gender?: string;

	@IsString()
	@IsOptional()
	nationality?: string;

	@IsString()
	@IsOptional()
	university?: string;

	@IsString()
	@IsOptional()
	description?: string;

	@IsBoolean()
	@IsNotEmpty()
	termsAccepted!: boolean;
}
