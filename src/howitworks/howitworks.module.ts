import { Module } from "@nestjs/common";
import { HowitworksService } from "./howitworks.service";
import { HowitworksController } from "./howitworks.controller";
import { MediaModule } from "../media/media.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
	imports: [MediaModule, PrismaModule],
	controllers: [HowitworksController],
	providers: [HowitworksService],
})
export class HowitworksModule {}
