import { Global, Module } from '@nestjs/common';
import { MinioService } from '.';

@Global()
@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class MinioModule {}
