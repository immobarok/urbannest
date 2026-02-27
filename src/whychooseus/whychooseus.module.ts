import { Module } from "@nestjs/common";
import { WhychooseusService } from "./whychooseus.service";
import { WhychooseusController } from "./whychooseus.controller";
import { MediaModule } from "../media/media.module";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
	imports: [MediaModule, PrismaModule],
	providers: [WhychooseusService],
	controllers: [WhychooseusController],
})
export class WhychooseusModule { }
