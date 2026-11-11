import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [ApplicationsService],
    }).compile();

    controller = module.get<ApplicationsController>(ApplicationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
