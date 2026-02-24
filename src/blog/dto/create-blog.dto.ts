import { IsInt, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateBlogDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(255)
	title!: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(2000)
	content!: string;

	@IsString()
	@IsNotEmpty()
	author!: string;

	@IsInt()
	@IsNotEmpty()
	readTime!: number;
}
