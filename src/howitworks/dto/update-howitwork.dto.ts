import { PartialType } from '@nestjs/mapped-types';
import { CreateHowitworkSectionDto } from './create-howitwork.dto';

export class UpdateHowitworkSectionDto extends PartialType(
  CreateHowitworkSectionDto,
) {}
