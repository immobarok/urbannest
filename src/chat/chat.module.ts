import { Module } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { ChatGateway } from "./chat.gateway";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { ChatController } from "./chat.controller";

@Module({
	imports: [PrismaModule, AuthModule],
	providers: [ChatGateway, ChatService],
	controllers: [ChatController],
	exports: [ChatService],
})
export class ChatModule {}
