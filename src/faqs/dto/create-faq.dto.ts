import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFaqDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  question!: string;

  @IsNotEmpty()
  @IsString()
  answer!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  faqsectionId?: string;
}

export class CreateFaqSectionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFaqDto)
  faqs?: CreateFaqDto[];
}
