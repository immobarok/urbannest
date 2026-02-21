import { PartialType } from '@nestjs/mapped-types';
import { CreateHowitworkStepDto } from './create-howitwork-step.dto';

export class UpdateStepDto extends PartialType(CreateHowitworkStepDto) {}
