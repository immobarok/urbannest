import { Module } from "@nestjs/common";
import { BookingService } from "./booking.service";
import { BookingController } from "./booking.controller";
import { PrismaService } from "../prisma/prisma.service";

@Module({
	controllers: [BookingController],
	providers: [BookingService, PrismaService],
	exports: [BookingService],
})
export class BookingModule {}
