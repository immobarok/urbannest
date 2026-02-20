import { IsArray, ArrayMinSize, IsString } from 'class-validator';

export class BulkDeleteMediaDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids!: string[];
}
