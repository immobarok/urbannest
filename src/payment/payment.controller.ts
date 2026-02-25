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

		// In a real production app, ensure raw body is passed.
		// For this implementation, we will pass req.body directly as Buffer,
		// assuming specific middleware configuration for this route.
		// If specific middleware is not set up, req.body might be JSON object, causing verification failure.

		// For now, let's assume raw body is available on `req.rawBody` (custom property often added)
		// or `req.body` if unparsed.
		// But standard Express `req` doesn't have `rawBody`.

		// Let's rely on PaymentService logic.
		// We'll pass req.body, but cast it to Buffer.
		// If parsed, JSON.stringify(req.body) might work but order of keys matters for signature.
		// Recommendation: Use raw-body middleware for this route.

		// As a placeholder, let's assume `req['rawBody']` exists if middleware configured.
		const rawBody = (req as unknown as Record<string, unknown>).rawBody;
		const payload: Buffer =
			(typeof rawBody === "string" ? Buffer.from(rawBody) : (rawBody as Buffer)) ||
			(req.body as Buffer);

		return this.paymentService.handleWebhook(signature, payload);
	}
}
