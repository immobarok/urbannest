import { Controller, Post, Body, Headers, Req, BadRequestException } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { CreatePaymentIntentDto } from "./dto/create-payment-intent.dto";
import type { Request } from "express";
import { Public } from "../common/decorators/public.decorator";

@Controller("payments")
export class PaymentController {
	constructor(private readonly paymentService: PaymentService) {}

	@Post("create-intent")
	async createPaymentIntent(@Body() createPaymentIntentDto: CreatePaymentIntentDto) {
		return this.paymentService.createPaymentIntent(createPaymentIntentDto);
	}

	@Public()
	@Post("webhook")
	async handleWebhook(@Headers("stripe-signature") signature: string, @Req() req: Request) {
		// For Stripe webhooks, we need the raw request body.
		// By default, NestJS parses the body. We need to access the raw buffer.
		// If using body-parser verify option, we can attach rawBody to req.
		// Here we assume req.body is the raw buffer if content-type is not application/json
		// or if we set up raw body middleware specifically.

		if (!signature) {
			throw new BadRequestException("Missing stripe-signature header");
		}

		// Access the raw buffer provided by NestJS (because rawBody: true is set in main.ts)
		const rawBody = (req as unknown as Record<string, unknown>).rawBody;

		// Ensure payload is a Buffer
		let payload: Buffer;
		if (Buffer.isBuffer(rawBody)) {
			payload = rawBody;
		} else if (typeof rawBody === "string") {
			payload = Buffer.from(rawBody);
		} else if (rawBody && typeof rawBody === "object") {
			payload = Buffer.from(JSON.stringify(rawBody));
		} else {
			// Fallback: This will likely fail signature verification but prevents the "object" error
			// The issue is likely that rawBody is undefined, so req.body (parsed JSON) is being used incorrectly later
			// But here we enforce Buffer return.
			payload = Buffer.from("");
		}

		return this.paymentService.handleWebhook(signature, payload);
	}
}
