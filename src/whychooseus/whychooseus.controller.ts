import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	UploadedFile,
	UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { WhychooseusService } from "./whychooseus.service";
import { Role, Roles } from "../common/decorators/roles.decorator";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";
import { CreateCardDto } from "./dto/create-card.dto";
import { UpdateCardDto } from "./dto/update-card.dto";

@Controller("whychooseus")
export class WhychooseusController {
	constructor(private readonly whyChooseUsService: WhychooseusService) {}

	// ── Section ─────────────────────────────────────────────────────────

	@Post("sections")
	@Roles(Role.ADMIN)
	@HttpCode(HttpStatus.CREATED)
	createSection(@Body() dto: CreateSectionDto) {
		return this.whyChooseUsService.createSection(dto);
	}

	@Get("sections")
	getSections() {
		return this.whyChooseUsService.findAllSections();
	}

	@Get("sections/:id")
	getSection(@Param("id", ParseIntPipe) id: number) {
		return this.whyChooseUsService.findOneSection(id);
	}

	@Patch("sections/:id")
	@Roles(Role.ADMIN)
	updateSection(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateSectionDto) {
		return this.whyChooseUsService.updateSection(id, dto);
	}

	@Delete("sections/:id")
	@Roles(Role.ADMIN)
	deleteSection(@Param("id", ParseIntPipe) id: number) {
		return this.whyChooseUsService.removeSection(id);
	}

	// ── Cards ───────────────────────────────────────────────────────────

	@Get("sections/:sectionId/cards")
	getCards(@Param("sectionId", ParseIntPipe) sectionId: number) {
		return this.whyChooseUsService.findAllCards(sectionId);
	}

	@Post("sections/:sectionId/cards")
	@Roles(Role.ADMIN)
	@UseInterceptors(FileInterceptor("file"))
	createCard(
		@Param("sectionId", ParseIntPipe) sectionId: number,
		@Body() dto: CreateCardDto,
		@UploadedFile() file?: Express.Multer.File,
	) {
		return this.whyChooseUsService.createCard(sectionId, dto, file);
	}

	@Patch("cards/:id")
	@Roles(Role.ADMIN)
	@UseInterceptors(FileInterceptor("file"))
	updateCard(
		@Param("id", ParseIntPipe) id: number,
		@Body() dto: UpdateCardDto,
		@UploadedFile() file?: Express.Multer.File,
	) {
		return this.whyChooseUsService.updateCard(id, dto, file);
	}

	@Delete("cards/:id")
	@Roles(Role.ADMIN)
	deleteCard(@Param("id", ParseIntPipe) id: number) {
		return this.whyChooseUsService.removeCard(id);
	}
}
