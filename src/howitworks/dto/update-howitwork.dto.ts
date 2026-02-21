import { PartialType } from '@nestjs/mapped-types';
import { CreateHowitworkDto } from './create-howitwork.dto';

export class UpdateHowitworkDto extends PartialType(CreateHowitworkDto) {}
