import { Controller, Get, Post, Body, Param, UseGuards, Request } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateConversationDto } from "./dto/create-conversation.dto";
import { CreateMessageDto } from "./dto/create-message.dto";

@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
	constructor(private readonly chatService: ChatService) {}

	@Get("conversations")
	getUserConversations(@CurrentUser() user: { id: string }) {
		return this.chatService.getUserConversations(user.id);
	}

	@Get("conversations/:id/messages")
	getMessages(@CurrentUser() user: { id: string }, @Param("id") id: string) {
		return this.chatService.getMessages(id, user.id);
	}

	@Post("conversations/:id/messages")
	async sendMessage(
		@CurrentUser() user: { id: string },
		@Param("id") id: string,
		@Body() createMessageDto: CreateMessageDto,
	) {
		createMessageDto.conversationId = id;
		return this.chatService.createMessage(user.id, createMessageDto);
	}

	@Post("conversations")
	async createConversation(
		@CurrentUser() user: { id: string },
		@Body() createConversationDto: CreateConversationDto,
	) {
		return this.chatService.createConversation(
			user.id,
			createConversationDto.targetUserId,
			createConversationDto.bookingId,
		);
	}
}
