import { Test, TestingModule } from '@nestjs/testing';
import { AreasController } from './areas.controller.js';
import { AreasService } from './areas.service.js';

describe('AreasController', () => {
  let controller: AreasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AreasController],
      providers: [AreasService],
    }).compile();

    controller = module.get<AreasController>(AreasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
