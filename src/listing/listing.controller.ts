import {
	Body,
	Controller,
	Delete,
	ForbiddenException,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	Query,
	UploadedFile,
	UploadedFiles,
	UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { Role } from "@prisma/client";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { ListingService } from "./listing.service";
import {
	AddListingPhotosDto,
	ApproveListingDto,
	CreateListingDto,
	ListingQueryDto,
	RejectListingDto,
	UpdateListingDto,
} from "./dto";
import { ListingEntity, ListingListEntity, ListingPhotoEntity } from "./entities";

const MAX_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 20;

@Controller("listings")
export class ListingController {
	constructor(private readonly listingService: ListingService) {}

	// ══════════════════════════════════════════════════════
	//  PUBLIC – Browse & View
	// ══════════════════════════════════════════════════════

	/** Browse all active listings (public, no auth required). */
	@Public()
	@Get()
	async findAll(@Query() query: ListingQueryDto): Promise<ListingListEntity> {
		return this.listingService.findPublicListings(query);
	}

	/** Get all unique cities with active listings (public). */
	@Public()
	@Get("cities")
	async findAllCities(): Promise<string[]> {
		return this.listingService.findCities();
	}

	/** View a single listing by ID (public). */
	@Public()
	@Get(":id")
	async findOne(@Param("id") id: string): Promise<ListingEntity> {
		return this.listingService.findOne(id);
	}

	/** View a single listing by slug (public). */
	@Public()
	@Get("slug/:slug")
	async findBySlug(@Param("slug") slug: string): Promise<ListingEntity> {
		return this.listingService.findBySlug(slug);
	}

	// ══════════════════════════════════════════════════════
	//  HOST – CRUD
	// ══════════════════════════════════════════════════════

	/** Get all listings for the current host. */
	@Get("host/mine")
	async findMyListings(
		@CurrentUser("id") hostId: string,
		@Query() query: ListingQueryDto,
	): Promise<ListingListEntity> {
		return this.listingService.findMyListings(hostId, query);
	}

	/** Create a new listing (HOST only). */
	@Post()
	async create(
		@CurrentUser() user: { id: string; role: Role },
		@Body() dto: CreateListingDto,
	): Promise<ListingEntity> {
		this.ensureRole(user.role, [Role.HOST, Role.ADMIN]);
		return this.listingService.create(user.id, dto);
	}

	/** Update a listing (owner HOST only). */
	@Patch(":id")
	async update(
		@Param("id") id: string,
		@CurrentUser() user: { id: string; role: Role },
		@Body() dto: UpdateListingDto,
	): Promise<ListingEntity> {
		this.ensureRole(user.role, [Role.HOST, Role.ADMIN]);
		return this.listingService.update(id, user.id, dto);
	}

	/** Submit a listing for admin approval. */
	@Patch(":id/submit")
	async submitForApproval(
		@Param("id") id: string,
		@CurrentUser() user: { id: string; role: Role },
	): Promise<ListingEntity> {
		this.ensureRole(user.role, [Role.HOST, Role.ADMIN]);
		return this.listingService.submitForApproval(id, user.id);
	}

	/** Delete a listing (owner HOST only). */
	@Delete(":id")
	@HttpCode(HttpStatus.OK)
	async remove(
		@Param("id") id: string,
		@CurrentUser() user: { id: string; role: Role },
	): Promise<ListingEntity> {
		this.ensureRole(user.role, [Role.HOST, Role.ADMIN]);
		return this.listingService.remove(id, user.id);
	}

	// ══════════════════════════════════════════════════════
	//  HOST – Photos (MinIO upload)
	// ══════════════════════════════════════════════════════

	/** Upload a single photo for a listing. */
	@Post(":id/photos")
	@UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_SIZE } }))
	async addPhoto(
		@Param("id") listingId: string,
		@CurrentUser() user: { id: string; role: Role },
		@UploadedFile() file: Express.Multer.File,
		@Body() dto: AddListingPhotosDto,
	): Promise<ListingPhotoEntity> {
		this.ensureRole(user.role, [Role.HOST, Role.ADMIN]);
		return this.listingService.addPhoto(listingId, user.id, file, dto);
	}

	/** Upload multiple photos for a listing. */
	@Post(":id/photos/bulk")
	@UseInterceptors(FilesInterceptor("files", MAX_FILES, { limits: { fileSize: MAX_SIZE } }))
	async addPhotos(
		@Param("id") listingId: string,
		@CurrentUser() user: { id: string; role: Role },
		@UploadedFiles() files: Express.Multer.File[],
		@Body() dto: AddListingPhotosDto,
	): Promise<ListingPhotoEntity[]> {
		this.ensureRole(user.role, [Role.HOST, Role.ADMIN]);
		return this.listingService.addPhotos(listingId, user.id, files, dto);
	}

	/** Delete a photo from a listing. */
	@Delete(":id/photos/:photoId")
	@HttpCode(HttpStatus.OK)
	async removePhoto(
		@Param("id") listingId: string,
		@Param("photoId") photoId: string,
		@CurrentUser() user: { id: string; role: Role },
	): Promise<ListingPhotoEntity> {
		this.ensureRole(user.role, [Role.HOST, Role.ADMIN]);
		return this.listingService.removePhoto(listingId, photoId, user.id);
	}

	// ══════════════════════════════════════════════════════
	//  ADMIN – Approval & Management
	// ══════════════════════════════════════════════════════

	/** Admin: browse all listings (any status). */
	@Get("admin/all")
	async findAllAdmin(
		@CurrentUser() user: { id: string; role: Role },
		@Query() query: ListingQueryDto,
	): Promise<ListingListEntity> {
		this.ensureRole(user.role, [Role.ADMIN]);
		return this.listingService.findAllAdmin(query);
	}

	/** Admin: approve a pending listing. */
	@Patch(":id/approve")
	async approve(
		@Param("id") id: string,
		@CurrentUser() user: { id: string; role: Role },
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		@Body() dto: ApproveListingDto,
	): Promise<ListingEntity> {
		this.ensureRole(user.role, [Role.ADMIN]);
		return this.listingService.approve(id, user.id);
	}

	/** Admin: reject a pending listing. */
	@Patch(":id/reject")
	async reject(
		@Param("id") id: string,
		@CurrentUser() user: { id: string; role: Role },
		@Body() dto: RejectListingDto,
	): Promise<ListingEntity> {
		this.ensureRole(user.role, [Role.ADMIN]);
		return this.listingService.reject(id, user.id, dto);
	}

	// ══════════════════════════════════════════════════════
	//  Private – Role Check
	// ══════════════════════════════════════════════════════

	/** Throw ForbiddenException if the user's role is not in the allowed list. */
	private ensureRole(userRole: Role, allowed: Role[]): void {
		if (!allowed.includes(userRole)) {
			throw new ForbiddenException(`This action requires one of: ${allowed.join(", ")}`);
		}
	}
}
