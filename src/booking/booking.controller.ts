import { Controller, Get, Post, Body, Patch, Param, UseGuards } from "@nestjs/common";
import { BookingService } from "./booking.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { CancelBookingDto } from "./dto/update-booking.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { User } from "@prisma/client";

import { Public } from "../common/decorators/public.decorator";

@Controller("bookings")
@UseGuards(JwtAuthGuard)
export class BookingController {
	constructor(private readonly bookingService: BookingService) {}

	@Public()
	@Get("availability/:listingId")
	getUnavailableDates(@Param("listingId") listingId: string) {
		return this.bookingService.getUnavailableDates(listingId);
	}

	@Post()
	create(@CurrentUser() user: User, @Body() createBookingDto: CreateBookingDto) {
		return this.bookingService.create(user.id, createBookingDto);
	}

	@Get("guest")
	getGuestBookings(@CurrentUser() user: User) {
		return this.bookingService.getGuestBookings(user.id);
	}

	@Get("host")
	getHostBookings(@CurrentUser() user: User) {
		return this.bookingService.getHostBookings(user.id);
	}

	@Get(":id")
	findOne(@Param("id") id: string, @CurrentUser() user: User) {
		return this.bookingService.findOne(id, user.id);
	}

	@Patch(":id/approve")
	approve(@Param("id") id: string, @CurrentUser() user: User) {
		return this.bookingService.approve(id, user.id);
	}

	@Patch(":id/cancel")
	cancel(
		@Param("id") id: string,
		@CurrentUser() user: User,
		@Body() cancelBookingDto: CancelBookingDto,
	) {
		return this.bookingService.cancel(id, user.id, cancelBookingDto);
	}
}
