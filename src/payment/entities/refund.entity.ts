import { Refund, PaymentStatus } from "@prisma/client";

export class RefundEntity implements Refund {
	id!: string;
	paymentId!: string;
	amount: any; // Decimal
	reason!: string;
	status!: PaymentStatus;
	providerRefundId!: string | null;
	processedById!: string | null;
	processedAt!: Date | null;
	createdAt!: Date;
	updatedAt!: Date;

	constructor(partial: Partial<RefundEntity>) {
		Object.assign(this, partial);
	}
}
