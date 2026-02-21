import { Test, TestingModule } from '@nestjs/testing';
import { HowitworksService } from './howitworks.service';

describe('HowitworksService', () => {
  let service: HowitworksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HowitworksService],
    }).compile();

    service = module.get<HowitworksService>(HowitworksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
