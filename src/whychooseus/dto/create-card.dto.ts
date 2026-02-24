import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateCardDto {
	@IsString()
	@IsNotEmpty()
	title!: string;

	@IsString()
	@IsOptional()
	description?: string;

	@IsString()
	@IsOptional()
	iconAlt?: string;

	@IsNumber()
	@Min(0)
	@IsOptional()
	@Type(() => Number)
	sortOrder?: number;
}
