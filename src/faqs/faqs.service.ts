import { Injectable, Logger } from '@nestjs/common';
import { CreateFaqDto, CreateFaqSectionDto } from './dto/create-faq.dto';
import { UpdateFaqDto, UpdateFaqSectionDto } from './dto/update-faq.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FaqsService {
  private logger = new Logger(FaqsService.name);
  constructor(private prisma: PrismaService) {}
  async create(dto: CreateFaqSectionDto) {
    this.logger.log(`Creating FAQ Section with data: ${JSON.stringify(dto)}`);

    const existingSections = await this.prisma.faqsection.findMany();
    if (existingSections.length > 0) {
      await this.prisma.faqsection.deleteMany();
    }

    return await this.prisma.faqsection.create({
      data: {
        title: dto.title,
        isActive: dto.isActive ?? true,
        faqs: dto.faqs
          ? {
              create: dto.faqs.map((faq) => ({
                question: faq.question,
                answer: faq.answer,
                isActive: faq.isActive ?? true,
              })),
            }
          : undefined,
      },
    });
  }

  async createFaq(createFaqDto: CreateFaqDto) {
    this.logger.log(`Creating FAQ with data: ${JSON.stringify(createFaqDto)}`);
    let sectionId = createFaqDto.faqsectionId;
    if (!sectionId) {
      const existingSection = await this.prisma.faqsection.findFirst();
      if (!existingSection) {
        throw new Error(
          'No FAQ section exists. Please create a section first.',
        );
      }
      sectionId = existingSection.id;
    }

    return await this.prisma.faq.create({
      data: {
        question: createFaqDto.question,
        answer: createFaqDto.answer,
        isActive: createFaqDto.isActive ?? true,
        faqsectionId: sectionId,
      },
    });
  }
  async findAll() {
    return await this.prisma.faqsection.findMany({
      include: {
        faqs: {
          select: {
            id: true,
            question: true,
            answer: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.faqsection.findUnique({
      where: { id },
      include: {
        faqs: true,
      },
    });
  }

  async update(id: string, updateFaqSectionDto: UpdateFaqSectionDto) {
    this.logger.log(
      `Updating FAQ Section with ID: ${id} and data: ${JSON.stringify(updateFaqSectionDto)}`,
    );
    return await this.prisma.faqsection.update({
      where: { id },
      data: {
        title: updateFaqSectionDto.title,
        isActive: updateFaqSectionDto.isActive,
      },
    });
  }

  async updateFaq(id: string, updateFaqDto: UpdateFaqDto) {
    this.logger.log(
      `Updating FAQ with ID: ${id} and data: ${JSON.stringify(updateFaqDto)}`,
    );
    return await this.prisma.faq.update({
      where: { id },
      data: {
        question: updateFaqDto.question,
        answer: updateFaqDto.answer,
        isActive: updateFaqDto.isActive,
        faqsectionId: updateFaqDto.faqsectionId,
      },
    });
  }

  async removeFaq(id: string) {
    this.logger.log(`Removing FAQ with ID: ${id}`);
    return await this.prisma.faq.delete({
      where: { id },
    });
  }
}
