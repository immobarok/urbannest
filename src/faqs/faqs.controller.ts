import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FaqsService } from './faqs.service';
import { CreateFaqDto, CreateFaqSectionDto } from './dto/create-faq.dto';
import { UpdateFaqDto, UpdateFaqSectionDto } from './dto/update-faq.dto';
import { Role, Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('faqs')
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post('section')
  createSection(@Body() createFaqSectionDto: CreateFaqSectionDto) {
    return this.faqsService.create(createFaqSectionDto);
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Post()
  createFaq(@Body() createFaqDto: CreateFaqDto) {
    return this.faqsService.createFaq(createFaqDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.faqsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.faqsService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Patch('section/:id')
  updateSection(
    @Param('id') id: string,
    @Body() updateFaqSectionDto: UpdateFaqSectionDto,
  ) {
    return this.faqsService.update(id, updateFaqSectionDto);
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Patch(':id')
  updateFaq(@Param('id') id: string, @Body() updateFaqDto: UpdateFaqDto) {
    return this.faqsService.updateFaq(id, updateFaqDto);
  }

  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  removeFaq(@Param('id') id: string) {
    return this.faqsService.removeFaq(id);
  }
}
