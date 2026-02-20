import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  alt?: string;
}
