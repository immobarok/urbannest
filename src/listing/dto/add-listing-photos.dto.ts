import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { Type } from "class-transformer";

export class AddListingPhotosDto {
	@IsOptional()
	@IsString()
	@MaxLength(255)
	caption?: string;

	@IsOptional()
	@IsBoolean()
	@Type(() => Boolean)
	isCover?: boolean;

	@IsOptional()
	@IsInt()
	@Min(0)
	@Max(100)
	@Type(() => Number)
	sortOrder?: number;
}
