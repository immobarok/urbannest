import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMessageDto } from "./dto/create-message.dto";

@Injectable()
export class ChatService {
	private readonly logger = new Logger(ChatService.name);

	constructor(private readonly prisma: PrismaService) {}

	async createMessage(senderId: string, createMessageDto: CreateMessageDto) {
		const { conversationId, content } = createMessageDto;

		// Check if user is participant
		const isParticipant = await this.prisma.conversationParticipant.findUnique({
			where: {
				conversationId_userId: {
					conversationId,
					userId: senderId,
				},
			},
		});

		if (!isParticipant) {
			throw new Error("User is not a participant in this conversation");
		}

		const message = await this.prisma.message.create({
			data: {
				content,
				conversationId,
				senderId,
			},
			include: {
				sender: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						avatarUrl: true,
					},
				},
			},
		});

		return message;
	}

	async getMessages(conversationId: string, userId: string) {
		// Validate participant
		const isParticipant = await this.prisma.conversationParticipant.findUnique({
			where: {
				conversationId_userId: { conversationId, userId },
			},
		});

		if (!isParticipant) {
			throw new Error("Access denied");
		}

		return this.prisma.message.findMany({
			where: { conversationId },
			orderBy: { createdAt: "asc" },
			include: {
				sender: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						avatarUrl: true,
					},
				},
			},
		});
	}

	async createConversation(userId: string, targetUserId: string, bookingId?: string) {
		if (userId === targetUserId) {
			throw new Error("You cannot start a conversation with yourself");
		}

		// Check if conversation already exists between these two users (optionally for this booking)
		const existingConversation = await this.prisma.conversation.findFirst({
			where: {
				bookingId,
				AND: [
					{ participants: { some: { userId } } },
					{ participants: { some: { userId: targetUserId } } },
				],
			},
			include: {
				participants: {
					include: {
						user: {
							select: { id: true, firstName: true, lastName: true, avatarUrl: true },
						},
					},
				},
			},
		});

		if (existingConversation) {
			return existingConversation;
		}

		// Simple implementation: Create new conversation
		const conversation = await this.prisma.conversation.create({
			data: {
				bookingId,
				participants: {
					create: [{ userId }, { userId: targetUserId }],
				},
			},
			include: {
				participants: {
					include: {
						user: {
							select: { id: true, firstName: true, lastName: true, avatarUrl: true },
						},
					},
				},
			},
		});

		return conversation;
	}

	async getUserConversations(userId: string) {
		return this.prisma.conversation.findMany({
			where: {
				participants: {
					some: {
						userId,
					},
				},
			},
			include: {
				participants: {
					include: {
						user: {
							select: { id: true, firstName: true, lastName: true, avatarUrl: true },
						},
					},
				},
				messages: {
					take: 1,
					orderBy: { createdAt: "desc" },
				},
			},
			orderBy: { updatedAt: "desc" },
		});
	}
}
