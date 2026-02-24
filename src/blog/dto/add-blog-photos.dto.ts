import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class AddBlogPhotosDto {
	@IsOptional()
	@IsString()
	@MaxLength(255)
	caption?: string;

	@IsNotEmpty()
	@IsString()
	url!: string;
}
