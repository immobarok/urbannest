import { Test, TestingModule } from '@nestjs/testing';
import { HowitworksController } from './howitworks.controller';
import { HowitworksService } from './howitworks.service';

describe('HowitworksController', () => {
  let controller: HowitworksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HowitworksController],
      providers: [HowitworksService],
    }).compile();

    controller = module.get<HowitworksController>(HowitworksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
