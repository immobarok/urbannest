import { IsString, IsNotEmpty, IsNumber, Min } from "class-validator";

export class RefundPaymentDto {
	@IsString()
	@IsNotEmpty()
	paymentId!: string;

	@IsNumber()
	@Min(0.01)
	amount!: number;

	@IsString()
	@IsNotEmpty()
	reason!: string;
}
