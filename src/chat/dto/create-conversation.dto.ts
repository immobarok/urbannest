import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateConversationDto {
	@IsString()
	@IsNotEmpty()
	targetUserId!: string;

	@IsString()
	@IsOptional()
	bookingId?: string;
}
