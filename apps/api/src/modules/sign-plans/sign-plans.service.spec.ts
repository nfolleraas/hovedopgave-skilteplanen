import { Test, TestingModule } from '@nestjs/testing';
import { R2Service } from '../s3/r2.service.js';
import { SignPlansRepository } from './sign-plans.repository.js';
import { SignPlansService } from './sign-plans.service.js';

describe('SignPlansService', () => {
  let service: SignPlansService;
  let repository: {
    add: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repository = {
      add: vi.fn(),
      getById: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignPlansService,
        { provide: SignPlansRepository, useValue: repository },
        {
          provide: R2Service,
          useValue: { delete: vi.fn(), upload: vi.fn() },
        },
      ],
    }).compile();

    service = module.get<SignPlansService>(SignPlansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('gets a sign plan by document uuid', async () => {
    const signPlan = { documentId: 'document-1' };
    repository.getById.mockResolvedValue(signPlan);

    await expect(service.findOne('document-1')).resolves.toBe(signPlan);
    expect(repository.getById).toHaveBeenCalledWith('document-1');
  });
});
