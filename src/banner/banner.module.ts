import { Module } from "@nestjs/common";
import { BannerService } from "./banner.service";
import { BannerController } from "./banner.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { MediaModule } from "../media/media.module";

@Module({
	imports: [PrismaModule, MediaModule],
	controllers: [BannerController],
	providers: [BannerService],
	exports: [BannerService],
})
export class BannerModule {}
