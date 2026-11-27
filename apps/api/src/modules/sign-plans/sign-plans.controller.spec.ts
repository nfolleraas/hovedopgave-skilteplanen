import { Test, TestingModule } from '@nestjs/testing';
import { SignPlansController } from './sign-plans.controller.js';
import { SignPlansService } from './sign-plans.service.js';

describe('SignPlansController', () => {
  let controller: SignPlansController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SignPlansController],
      providers: [
        {
          provide: SignPlansService,
          useValue: { create: vi.fn(), findOne: vi.fn() },
        },
      ],
    }).compile();

    controller = module.get<SignPlansController>(SignPlansController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
