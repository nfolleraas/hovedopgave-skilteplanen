import { Test, TestingModule } from '@nestjs/testing';
import { RoadPermitController } from './road-permit.controller.js';
import { RoadPermitRepository } from './road-permit.repository.js';
import { RoadPermitService } from './road-permit.service.js';

describe('RoadPermitController', () => {
  let controller: RoadPermitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoadPermitController],
      providers: [RoadPermitRepository, RoadPermitService],
    }).compile();

    controller = module.get<RoadPermitController>(RoadPermitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
