import { Test, TestingModule } from '@nestjs/testing';
import { RoadPermitRepository } from './road-permit.repository.js';
import { RoadPermitService } from './road-permit.service.js';

describe('RoadPermitService', () => {
  let service: RoadPermitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoadPermitRepository, RoadPermitService],
    }).compile();

    service = module.get<RoadPermitService>(RoadPermitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
