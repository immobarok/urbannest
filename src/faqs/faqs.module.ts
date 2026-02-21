import { Module } from '@nestjs/common';
import { FaqsService } from './faqs.service';
import { FaqsController } from './faqs.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FaqsController],
  providers: [FaqsService],
})
export class FaqsModule {}
