import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	OnGatewayConnection,
	OnGatewayDisconnect,
	ConnectedSocket,
	MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { CreateMessageDto } from "./dto/create-message.dto";

// Standard JWT verification for WS
// Assuming user can authenticate via query param or handshake auth
// For simplicity, let's just use query param token
@WebSocketGateway({
	cors: {
		origin: "*", // Adjust for production
	},
	namespace: "chat",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server!: Server;

	private readonly logger = new Logger(ChatGateway.name);

	constructor(
		private readonly chatService: ChatService,
		// Inject AuthService or similar if you want to verify token here
	) {}

	handleConnection(client: Socket) {
		// TODO: Verify JWT token and disconnect invalid clients
		// const token = client.handshake.query.token as string;
		// const userId = this.authService.verify(token);
		// if (!userId) { client.disconnect(); return; }
		// client.join(`user:${userId}`);

		this.logger.log(`Client connected: ${client.id}`);
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`Client disconnected: ${client.id}`);
	}

	@SubscribeMessage("sendMessage")
	async handleMessage(
		@ConnectedSocket() client: Socket,
		@MessageBody() createMessageDto: CreateMessageDto,
	) {
		// In a real app, get senderId from the authenticated socket user
		// const senderId = client.data.user.id;
		const senderId = client.handshake.query.userId as string; // Temporary for dev

		if (!senderId) {
			// client.emit('error', 'Unauthorized');
			return;
		}

		const newMessage = await this.chatService.createMessage(senderId, createMessageDto);

		// Emit to all clients in this conversation room
		this.server
			.to(`conversation:${createMessageDto.conversationId}`)
			.emit("newMessage", newMessage);

		return newMessage;
	}

	@SubscribeMessage("joinConversation")
	async handleJoinConversation(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: { conversationId: string },
	) {
		await client.join(`conversation:${data.conversationId}`);
		this.logger.log(`Client ${client.id} joined conversation ${data.conversationId}`);
		return { event: "joined", conversationId: data.conversationId };
	}

	@SubscribeMessage("leaveConversation")
	async handleLeaveConversation(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: { conversationId: string },
	) {
		await client.leave(`conversation:${data.conversationId}`);
		return { event: "left", conversationId: data.conversationId };
	}
}
