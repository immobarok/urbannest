import { Module } from "@nestjs/common";
import { ListingController } from "./listing.controller";
import { ListingService } from "./listing.service";
import { PrismaModule } from "../prisma/prisma.module";
import { MediaModule } from "../media/media.module";

@Module({
	imports: [PrismaModule, MediaModule],
	controllers: [ListingController],
	providers: [ListingService],
	exports: [ListingService],
})
export class ListingModule { }
