import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID } from "class-validator";

export class CreateBannerDto {
	@IsNotEmpty()
	@IsString()
	pageSlug!: string;

	@IsNotEmpty()
	@IsString()
	title!: string;

	@IsOptional()
	@IsString()
	subtitle?: string;

	@IsOptional()
	@IsUUID()
	mediaId?: string;

	@IsNotEmpty()
	@IsUrl()
	imageUrl!: string;

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}
