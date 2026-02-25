import {
	BadRequestException,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBookingDto } from "./dto/create-booking.dto";
import { BookingStatus, Prisma } from "@prisma/client";
import { CancelBookingDto } from "./dto/update-booking.dto";

@Injectable()
export class BookingService {
	constructor(private readonly prisma: PrismaService) {}

	async create(userId: string, createBookingDto: CreateBookingDto) {
		const { listingId, checkIn, checkOut, guestCount, guestNote } = createBookingDto;

		// 1. Fetch Listing
		const listing = await this.prisma.listing.findUnique({
			where: { id: listingId },
		});

		if (!listing) {
			throw new NotFoundException("Listing not found");
		}

		// 2. Validate Dates
		const checkInDate = new Date(checkIn);
		const checkOutDate = new Date(checkOut);

		if (checkInDate >= checkOutDate) {
			throw new BadRequestException("Check-out date must be after check-in date");
		}

		// Calculate nights
		const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
		const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (nights < listing.minNights) {
			throw new BadRequestException(`Minimum stay is ${listing.minNights} nights`);
		}
		if (listing.maxNights && nights > listing.maxNights) {
			throw new BadRequestException(`Maximum stay is ${listing.maxNights} nights`);
		}

		// 3. Check Availability
		const conflictingBooking = await this.prisma.booking.findFirst({
			where: {
				listingId,
				status: BookingStatus.CONFIRMED,
				OR: [
					{
						checkIn: { lt: checkOutDate },
						checkOut: { gt: checkInDate },
					},
				],
			},
		});

		if (conflictingBooking) {
			throw new BadRequestException("Listing is not available for selected dates");
		}

		// 4. Calculate Prices
		const basePrice = Number(listing.basePrice);
		const cleaningFee = listing.cleaningFee ? Number(listing.cleaningFee) : 0;
		const securityDeposit = listing.securityDeposit ? Number(listing.securityDeposit) : 0;
		const serviceFeePercent = listing.serviceFeePercent || 0;

		const baseAmount = basePrice * nights;
		const serviceFee = (baseAmount + cleaningFee) * (serviceFeePercent / 100);
		const totalAmount = baseAmount + cleaningFee + serviceFee + securityDeposit;
		const hostPayout = totalAmount - serviceFee; // Simple payout calc: total - platform fee

		// 5. Create Booking
		const booking = await this.prisma.booking.create({
			data: {
				listingId,
				guestId: userId,
				checkIn: checkInDate,
				checkOut: checkOutDate,
				nights,
				guestCount,
				status: listing.instantBook ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
				baseAmount: new Prisma.Decimal(baseAmount),
				cleaningFee: new Prisma.Decimal(cleaningFee),
				serviceFee: new Prisma.Decimal(serviceFee),
				securityDeposit: new Prisma.Decimal(securityDeposit),
				totalAmount: new Prisma.Decimal(totalAmount),
				hostPayout: new Prisma.Decimal(hostPayout),
				guestNote,
				confirmedAt: listing.instantBook ? new Date() : null,
			},
			include: {
				listing: true, // Include listing details in response
				guest: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
						// picture: true,
					},
				},
			},
		});

		return booking;
	}

	async getHostBookings(hostId: string) {
		// Find listings owned by host, then find bookings for those listings
		return this.prisma.booking.findMany({
			where: {
				listing: {
					hostId: hostId,
				},
			},
			include: {
				guest: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
						// picture: true,
					},
				},
				listing: {
					select: {
						id: true,
						title: true,
						address: true,
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});
	}

	async getGuestBookings(guestId: string) {
		return this.prisma.booking.findMany({
			where: {
				guestId,
			},
			include: {
				listing: {
					select: {
						id: true,
						title: true,
						address: true,
						city: true,
						country: true,
						// photos usually needed, assuming relation or fetching separately
					},
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});
	}

	async findOne(id: string, userId: string) {
		const booking = await this.prisma.booking.findUnique({
			where: { id },
			include: {
				guest: true, // Full guest info? Or specialized?
				listing: true,
			},
		});

		if (!booking) {
			throw new NotFoundException("Booking not found");
		}

		// Authorization check: Only guest or host can view details
		if (booking.guestId !== userId && booking.listing.hostId !== userId) {
			// Check if admin? Assuming no role passed here yet, stick to ownership
			throw new UnauthorizedException("Access denied");
		}

		return booking;
	}

	async approve(id: string, hostId: string) {
		const booking = await this.prisma.booking.findUnique({
			where: { id },
			include: { listing: true },
		});

		if (!booking) {
			throw new NotFoundException("Booking not found");
		}

		if (booking.listing.hostId !== hostId) {
			throw new UnauthorizedException("Only the host can approve this booking");
		}

		if (booking.status !== BookingStatus.PENDING) {
			throw new BadRequestException(`Booking is already ${booking.status}`);
		}

		return this.prisma.booking.update({
			where: { id },
			data: {
				status: BookingStatus.CONFIRMED,
				confirmedAt: new Date(),
			},
		});
	}

	async cancel(id: string, userId: string, cancelDto: CancelBookingDto) {
		const booking = await this.prisma.booking.findUnique({
			where: { id },
			include: { listing: true },
		});

		if (!booking) {
			throw new NotFoundException("Booking not found");
		}

		const isHost = booking.listing.hostId === userId;
		const isGuest = booking.guestId === userId;

		if (!isHost && !isGuest) {
			throw new UnauthorizedException("You are not authorized to cancel this booking");
		}

		if (booking.status === BookingStatus.CANCELLED) {
			throw new BadRequestException("Booking is already cancelled");
		}

		if (booking.status === BookingStatus.COMPLETED) {
			throw new BadRequestException("Cannot cancel a completed booking");
		}

		// Logic for refund could go here based on policy

		return this.prisma.booking.update({
			where: { id },
			data: {
				status: BookingStatus.CANCELLED,
				cancelledAt: new Date(),
				cancelledById: userId,
				cancellationReason: cancelDto.reason,
			},
		});
	}
}
