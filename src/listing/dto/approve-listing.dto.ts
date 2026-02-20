import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveListingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
