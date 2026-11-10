import { Test, TestingModule } from '@nestjs/testing';
import { SignPlansService } from './sign-plans.service.js';

describe('SignPlansService', () => {
  let service: SignPlansService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignPlansService],
    }).compile();

    service = module.get<SignPlansService>(SignPlansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
