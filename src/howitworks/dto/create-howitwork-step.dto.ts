import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateHowitworkStepDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  description!: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsNotEmpty()
  @IsUUID()
  sectionId!: string;
}
