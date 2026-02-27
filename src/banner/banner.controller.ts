import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	ParseIntPipe,
	UseInterceptors,
	UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { BannerService } from "./banner.service";
import { CreateBannerDto } from "./dto/create-banner.dto";
import { UpdateBannerDto } from "./dto/update-banner.dto";
import { Roles, Role } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";

@Controller("banners")
export class BannerController {
	constructor(private readonly bannerService: BannerService) {}

	@Post()
	@Roles(Role.ADMIN)
	create(@Body() createBannerDto: CreateBannerDto) {
		return this.bannerService.create(createBannerDto);
	}

	@Post("upload")
	@Roles(Role.ADMIN)
	@UseInterceptors(FileInterceptor("file"))
	uploadImage(@UploadedFile() file: Express.Multer.File, @CurrentUser("id") userId: string) {
		return this.bannerService.uploadImage(file, userId);
	}

	@Get()
	@Public()
	findAll() {
		return this.bannerService.findAll();
	}

	@Get(":id")
	@Public()
	findOne(@Param("id", ParseIntPipe) id: number) {
		return this.bannerService.findOne(id);
	}

	@Get("slug/:slug")
	@Public()
	findBySlug(@Param("slug") slug: string) {
		return this.bannerService.findBySlug(slug);
	}

	@Patch(":id")
	@Roles(Role.ADMIN)
	update(@Param("id", ParseIntPipe) id: number, @Body() updateBannerDto: UpdateBannerDto) {
		return this.bannerService.update(id, updateBannerDto);
	}

	@Delete(":id")
	@Roles(Role.ADMIN)
	remove(@Param("id", ParseIntPipe) id: number) {
		return this.bannerService.remove(id);
	}
}
