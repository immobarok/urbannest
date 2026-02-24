import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { BlogService } from "./blog.service";
import { CreateBlogDto } from "./dto/create-blog.dto";
import { UpdateBlogDto } from "./dto/update-blog.dto";
import { AddBlogPhotosDto } from "./dto/add-blog-photos.dto";
import { Roles, Role } from "../common/decorators/roles.decorator";
import { Public } from "../common/decorators/public.decorator";

@Controller("blog")
export class BlogController {
	constructor(private readonly blogService: BlogService) {}

	@Roles(Role.ADMIN)
	@Post()
	async create(@Body() dto: CreateBlogDto) {
		return this.blogService.create(dto);
	}

	@Public()
	@Get()
	async findAll() {
		return this.blogService.findAll();
	}

	@Public()
	@Get(":id")
	async findOne(@Param("id", ParseIntPipe) id: number) {
		return this.blogService.findOne(id);
	}

	@Roles(Role.ADMIN)
	@Patch(":id")
	async update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateBlogDto) {
		return this.blogService.update(id, dto);
	}

	@Roles(Role.ADMIN)
	@Delete(":id")
	async remove(@Param("id", ParseIntPipe) id: number) {
		return this.blogService.remove(id);
	}

	@Roles(Role.ADMIN)
	@Post(":id/photos")
	async addPhotos(@Param("id", ParseIntPipe) id: number, @Body() dto: AddBlogPhotosDto) {
		return this.blogService.addPhotos(id, dto);
	}

	@Roles(Role.ADMIN)
	@Post(":id/upload-image")
	@UseInterceptors(FileInterceptor("file"))
	async uploadImage(
		@Param("id", ParseIntPipe) id: number,
		@UploadedFile() file: Express.Multer.File,
		@Body("caption") caption?: string,
	) {
		return this.blogService.uploadImage(id, file, caption);
	}

	@Roles(Role.ADMIN)
	@Delete(":id/photos/:photoId")
	async removePhoto(
		@Param("id", ParseIntPipe) id: number,
		@Param("photoId", ParseIntPipe) photoId: number,
	) {
		return this.blogService.removePhoto(id, photoId);
	}
}
