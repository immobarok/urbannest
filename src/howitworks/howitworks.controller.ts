import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	HttpCode,
	HttpStatus,
	ParseUUIDPipe,
	UseInterceptors,
	UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { HowitworksService } from "./howitworks.service";
import { CreateHowitworkSectionDto } from "./dto/create-howitwork.dto";
import { UpdateHowitworkSectionDto } from "./dto/update-howitwork.dto";
import { CreateHowitworkStepDto } from "./dto/create-howitwork-step.dto";
import { UpdateStepDto } from "./dto/update-howitwork-step.dto";
import { Role, Roles } from "../common/decorators/roles.decorator";
import { Public } from "../common/decorators/public.decorator";

/** 2 MB limit enforced at multer level */
const MAX_ICON_SIZE = 2 * 1024 * 1024;

@Controller("howitworks")
export class HowitworksController {
	constructor(private readonly howitworksService: HowitworksService) {}

	// ── Section Endpoints ────────────────────────────────────────

	/** Create (or replace) the HowItWorks section with optional inline steps. */
	@Roles(Role.ADMIN)
	@HttpCode(HttpStatus.CREATED)
	@Post("section")
	createSection(@Body() dto: CreateHowitworkSectionDto) {
		return this.howitworksService.create(dto);
	}

	/** Update a section's metadata (title, isActive). */
	@Roles(Role.ADMIN)
	@HttpCode(HttpStatus.OK)
	@Patch("section/:id")
	updateSection(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateHowitworkSectionDto) {
		return this.howitworksService.update(id, dto);
	}

	// ── Step Endpoints ───────────────────────────────────────────

	/** Create a step with an optional icon file upload. */
	@Roles(Role.ADMIN)
	@HttpCode(HttpStatus.CREATED)
	@Post()
	@UseInterceptors(FileInterceptor("icon", { limits: { fileSize: MAX_ICON_SIZE } }))
	createStep(@Body() dto: CreateHowitworkStepDto, @UploadedFile() file?: Express.Multer.File) {
		return this.howitworksService.createStep(dto, file);
	}

	/** Update a step and optionally replace its icon. */
	@Roles(Role.ADMIN)
	@HttpCode(HttpStatus.OK)
	@Patch(":id")
	@UseInterceptors(FileInterceptor("icon", { limits: { fileSize: MAX_ICON_SIZE } }))
	updateStep(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() dto: UpdateStepDto,
		@UploadedFile() file?: Express.Multer.File,
	) {
		return this.howitworksService.updateStep(id, dto, file);
	}

	/** Remove a step and clean up its icon from storage. */
	@Roles(Role.ADMIN)
	@HttpCode(HttpStatus.OK)
	@Delete(":id")
	removeStep(@Param("id", ParseUUIDPipe) id: string) {
		return this.howitworksService.removeStep(id);
	}

	// ── Public / Read Endpoints ──────────────────────────────────

	/** List all sections with steps (public). */
	@Public()
	@Get()
	findAll() {
		return this.howitworksService.findAll();
	}

	/** Get a single section by ID. */
	@Get(":id")
	findOne(@Param("id", ParseUUIDPipe) id: string) {
		return this.howitworksService.findOne(id);
	}
}
