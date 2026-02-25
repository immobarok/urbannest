import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePaymentIntentDto } from "./dto/create-payment-intent.dto";
import { PaymentStatus, PaymentProvider } from "@prisma/client";

@Injectable()
export class PaymentService {
	private stripe: Stripe;
	private readonly logger = new Logger(PaymentService.name);

	constructor(
		private configService: ConfigService,
		private prisma: PrismaService,
	) {
		const stripeSecretKey = this.configService.get<string>("STRIPE_SECRET_KEY");
		if (!stripeSecretKey) {
			this.logger.error("STRIPE_SECRET_KEY is not defined");
			// In a real app, you might want to throw or handle gracefully if stripe isn't configured,
			// but for now let's assume it will be set.
		}

		this.stripe = new Stripe(stripeSecretKey || "", {
			apiVersion: "2026-02-25.clover",
		});
	}

	async createPaymentIntent(createPaymentDto: CreatePaymentIntentDto) {
		const { bookingId } = createPaymentDto;

		const booking = await this.prisma.booking.findUnique({
			where: { id: bookingId },
		});

		if (!booking) {
			throw new NotFoundException("Booking not found");
		}

		// Amount in cents
		const amount = Math.round(Number(booking.totalAmount) * 100);
		const currency = "usd"; // Could be dynamic based on listing or settings

		try {
			const paymentIntent = await this.stripe.paymentIntents.create({
				amount,
				currency,
				metadata: {
					bookingId: booking.id,
				},
				payment_method_types: ["card"],
			});

			// Create Payment record in DB
			await this.prisma.payment.create({
				data: {
					bookingId: booking.id,
					amount: booking.totalAmount, // Store decimal value
					currency: currency.toUpperCase(),
					status: PaymentStatus.PENDING,
					provider: PaymentProvider.STRIPE,
					providerPaymentId: paymentIntent.id,
				},
			});

			return {
				clientSecret: paymentIntent.client_secret,
				paymentIntentId: paymentIntent.id,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error(`Failed to create payment intent: ${errorMessage}`);
			throw new BadRequestException("Failed to create payment intent");
		}
	}

	async handleWebhook(signature: string, payload: Buffer) {
		const webhookSecret = this.configService.get<string>("STRIPE_WEBHOOK_SECRET");
		if (!webhookSecret) {
			this.logger.error("STRIPE_WEBHOOK_SECRET is not defined");
			throw new BadRequestException("Webhook secret is not configured");
		}
		let event: Stripe.Event;

		try {
			event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			this.logger.error(`Webhook signature verification failed: ${errorMessage}`);
			throw new BadRequestException("Webhook signature verification failed");
		}

		const data = event.data.object as Stripe.PaymentIntent;

		switch (event.type) {
			case "payment_intent.succeeded":
				await this.handlePaymentSuccess(data);
				break;
			case "payment_intent.payment_failed":
				await this.handlePaymentFailure(data);
				break;
			// Handle other events as needed
		}

		return { received: true };
	}

	private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
		const payment = await this.prisma.payment.findFirst({
			where: { providerPaymentId: paymentIntent.id },
		});

		if (!payment) {
			this.logger.warn(`Payment not found for Intent ID: ${paymentIntent.id}`);
			return;
		}

		await this.prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentStatus.COMPLETED,
				paidAt: new Date(),
			},
		});

		// Check if booking needs to be updated (e.g. status -> CONFIRMED)
		// This depends on business logic; maybe waiting for host approval first?
		// Let's create a notification or just leave it for now.
		// Example: Update booking status if it was pending payment
		// await this.prisma.booking.update({
		//   where: { id: payment.bookingId },
		//   data: { status: 'CONFIRMED' }, // If assuming instant confirmation upon payment
		// });

		this.logger.log(`Payment ${payment.id} succeeded`);
	}

	private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
		const payment = await this.prisma.payment.findFirst({
			where: { providerPaymentId: paymentIntent.id },
		});

		if (!payment) {
			return;
		}

		await this.prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentStatus.FAILED,
				failureReason: paymentIntent.last_payment_error?.message || "Unknown error",
			},
		});

		this.logger.warn(`Payment ${payment.id} failed`);
	}
}
