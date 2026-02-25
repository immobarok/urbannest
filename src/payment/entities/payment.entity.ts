import { Payment, PaymentStatus, PaymentProvider } from "@prisma/client";

export class PaymentEntity implements Payment {
	id!: string;
	bookingId!: string;
	amount: any;
	currency!: string;
	status!: PaymentStatus;
	provider!: PaymentProvider;
	providerPaymentId!: string | null;
	providerChargeId!: string | null;
	paymentMethodId!: string | null;
	paidAt!: Date | null;
	failureReason!: string | null;
	createdAt!: Date;
	updatedAt!: Date;

	constructor(partial: Partial<PaymentEntity>) {
		Object.assign(this, partial);
	}
}
