import { Type } from "class-transformer";
import { IsDate, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

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
	@IsOptional()
	guestNote?: string;
}
