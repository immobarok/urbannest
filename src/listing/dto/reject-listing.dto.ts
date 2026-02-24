import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RejectListingDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(1000)
	reason!: string;
}
