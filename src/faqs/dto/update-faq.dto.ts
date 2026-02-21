import { PartialType } from '@nestjs/mapped-types';
import { CreateFaqDto, CreateFaqSectionDto } from './create-faq.dto';

export class UpdateFaqDto extends PartialType(CreateFaqDto) {}

export class UpdateFaqSectionDto extends PartialType(CreateFaqSectionDto) {}
