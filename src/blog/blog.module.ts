import { Module } from "@nestjs/common";
import { BlogService } from "./blog.service";
import { BlogController } from "./blog.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { MediaModule } from "../media/media.module";

@Module({
	imports: [PrismaModule, MediaModule],
	controllers: [BlogController],
	providers: [BlogService],
	exports: [BlogService],
})
export class BlogModule { }
