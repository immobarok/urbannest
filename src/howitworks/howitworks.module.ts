import { Module } from '@nestjs/common';
import { HowitworksService } from './howitworks.service';
import { HowitworksController } from './howitworks.controller';

@Module({
  controllers: [HowitworksController],
  providers: [HowitworksService],
})
export class HowitworksModule {}
