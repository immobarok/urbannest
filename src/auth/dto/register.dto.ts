import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { Role } from "@prisma/client";

export class RegisterDto {
	@IsEmail()
	email!: string;

	@IsString()
	@IsNotEmpty()
	@MinLength(6)
	password!: string;

	@IsString()
	@IsNotEmpty()
	firstName!: string;

	@IsString()
	@IsNotEmpty()
	lastName!: string;

	@IsOptional()
	@IsEnum(Role)
	role?: Role;
}
