import { Module } from "@nestjs/common";
import { WhychooseusService } from "./whychooseus.service";
import { WhychooseusController } from "./whychooseus.controller";
import { MinioModule } from "src/minio";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
	imports: [MinioModule, PrismaModule],
	providers: [WhychooseusService],
	controllers: [WhychooseusController],
})
export class WhychooseusModule {}
