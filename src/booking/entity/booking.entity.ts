import { Booking, BookingStatus } from "@prisma/client";

export class BookingEntity implements Booking {
	id!: string;
	listingId!: string;
	guestId!: string;
	checkIn!: Date;
	checkOut!: Date;
	nights!: number;
	guestCount!: number;
	status!: BookingStatus;
	baseAmount!: any;
	cleaningFee!: any;
	serviceFee!: any;
	securityDeposit!: any;
	totalAmount!: any;
	hostPayout!: any;
	guestNote!: string;
	cancellationReason!: string;
	cancelledById!: string;
	cancelledAt!: Date;
	confirmedAt!: Date;
	completedAt!: Date;
	checkInReminderSent!: boolean;
	reviewReminderSent!: boolean;
	createdAt!: Date;
	updatedAt!: Date;

	constructor(partial: Partial<BookingEntity>) {
		Object.assign(this, partial);
	}
	firstName!: string | null;
	lastName!: string | null;
	email!: string | null;
	phone!: string | null;
	dob!: Date | null;
	gender!: string | null;
	nationality!: string | null;
	university!: string | null;
}
