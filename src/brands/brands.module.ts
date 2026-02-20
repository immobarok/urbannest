import { Module } from '@nestjs/common';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { MinioModule } from '../minio/minio.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, MinioModule],
  controllers: [BrandsController],
  providers: [BrandsService],
})
export class BrandsModule {}
