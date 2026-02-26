import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateMessageDto {
	@IsString()
	@IsNotEmpty()
	content!: string;

	@IsString()
	@IsOptional()
	// This is populated from the URL in REST or required in GraphQL/WS if not in context
	conversationId!: string;
}
