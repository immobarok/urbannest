import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt?: string;
}
