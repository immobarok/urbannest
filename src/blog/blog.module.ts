import { Module } from "@nestjs/common";
import { BlogService } from "./blog.service";
import { BlogController } from "./blog.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { MinioModule } from "../minio/minio.module";

@Module({
	imports: [PrismaModule, MinioModule],
	controllers: [BlogController],
	providers: [BlogService],
	exports: [BlogService],
})
export class BlogModule {}
