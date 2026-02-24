import { Module } from "@nestjs/common";
import { ListingController } from "./listing.controller";
import { ListingService } from "./listing.service";
import { PrismaModule } from "../prisma/prisma.module";
import { MinioModule } from "../minio";

@Module({
	imports: [PrismaModule, MinioModule],
	controllers: [ListingController],
	providers: [ListingService],
	exports: [ListingService],
})
export class ListingModule {}
