import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty()
  header!: string;

  @IsString()
  @IsOptional()
  headerHighlight?: string;

  @IsString()
  @IsOptional()
  subHeader?: string;
}
