import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ListingStatus, BookingStatus, Prisma } from "@prisma/client";

@Injectable()
export class DashboardService {
	constructor(private readonly prisma: PrismaService) {}

	async getAdminStats(filters?: { city?: string; minPrice?: number; maxPrice?: number }) {
		const now = new Date();
		// Start of the week (Sunday as first day)
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());
		startOfWeek.setHours(0, 0, 0, 0);

		const listingWhere: Prisma.ListingWhereInput = {};
		if (filters?.city) {
			listingWhere.city = { contains: filters.city, mode: "insensitive" };
		}
		if (filters?.minPrice || filters?.maxPrice) {
			listingWhere.basePrice = {};
			if (filters.minPrice) (listingWhere.basePrice as any).gte = filters.minPrice;
			if (filters.maxPrice) (listingWhere.basePrice as any).lte = filters.maxPrice;
		}

		// For bookings, we filter by the listing's properties
		const bookingWhere: Prisma.BookingWhereInput = {
			listing: listingWhere,
		};

		const [
			totalActiveListings,
			totalPendingListings,
			totalBookings,
			totalPendingBookings,
			newActiveListingsThisWeek,
			newPendingListingsThisWeek,
			newBookingsThisWeek,
			newPendingBookingsThisWeek,
		] = await Promise.all([
			// Totals
			this.prisma.listing.count({
				where: { ...listingWhere, status: ListingStatus.ACTIVE },
			}),
			this.prisma.listing.count({
				where: { ...listingWhere, status: ListingStatus.PENDING_APPROVAL },
			}),
			this.prisma.booking.count({ where: bookingWhere }),
			this.prisma.booking.count({
				where: { ...bookingWhere, status: BookingStatus.PENDING },
			}),

			// Weekly counts (how many were created or approved this week)
			this.prisma.listing.count({
				where: {
					...listingWhere,
					status: ListingStatus.ACTIVE,
					approvedAt: { gte: startOfWeek },
				},
			}),
			this.prisma.listing.count({
				where: {
					...listingWhere,
					status: ListingStatus.PENDING_APPROVAL,
					createdAt: { gte: startOfWeek },
				},
			}),
			this.prisma.booking.count({
				where: {
					...bookingWhere,
					createdAt: { gte: startOfWeek },
				},
			}),
			this.prisma.booking.count({
				where: {
					...bookingWhere,
					status: BookingStatus.PENDING,
					createdAt: { gte: startOfWeek },
				},
			}),
		]);

		return {
			overview: {
				totalActiveListings,
				totalPendingListings,
				totalBookings,
				totalPendingBookings,
			},
			thisWeek: {
				newActiveListings: newActiveListingsThisWeek,
				newPendingListings: newPendingListingsThisWeek,
				newBookings: newBookingsThisWeek,
				newPendingBookings: newPendingBookingsThisWeek,
			},
		};
	}
}
