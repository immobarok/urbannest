import { BookingStatus } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpdateBookingStatusDto {
	@IsEnum(BookingStatus)
	@IsNotEmpty()
	status!: BookingStatus;
}

export class CancelBookingDto {
	@IsString()
	@IsOptional()
	reason?: string;
}
