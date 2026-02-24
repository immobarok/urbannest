import { Module } from "@nestjs/common";
import { ContactService } from "./contact.service";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
	imports: [PrismaModule],
	providers: [ContactService],
	exports: [ContactService],
})
export class ContactModule {}
