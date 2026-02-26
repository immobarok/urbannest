import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ListingStatus, BookingStatus } from "@prisma/client";

@Injectable()
export class DashboardService {
	constructor(private readonly prisma: PrismaService) {}

	async getAdminStats() {
		const now = new Date();
		// Start of the week (Sunday as first day)
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());
		startOfWeek.setHours(0, 0, 0, 0);

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
			this.prisma.listing.count({ where: { status: ListingStatus.ACTIVE } }),
			this.prisma.listing.count({ where: { status: ListingStatus.PENDING_APPROVAL } }),
			this.prisma.booking.count(),
			this.prisma.booking.count({ where: { status: BookingStatus.PENDING } }),

			// Weekly counts (how many were created or approved this week)
			this.prisma.listing.count({
				where: {
					status: ListingStatus.ACTIVE,
					approvedAt: { gte: startOfWeek },
				},
			}),
			this.prisma.listing.count({
				where: {
					status: ListingStatus.PENDING_APPROVAL,
					createdAt: { gte: startOfWeek },
				},
			}),
			this.prisma.booking.count({
				where: {
					createdAt: { gte: startOfWeek },
				},
			}),
			this.prisma.booking.count({
				where: {
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
