import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../generated/prisma/client.js';
import { SignPlanType } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SignPlansRepository } from './sign-plans.repository.js';

describe('SignPlansRepository', () => {
  let repository: SignPlansRepository;
  let prisma: {
    signPlan: {
      create: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      signPlan: {
        create: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignPlansRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<SignPlansRepository>(SignPlansRepository);
  });

  it('creates a sign plan', async () => {
    const data: Prisma.SignPlanCreateInput = {
      signPlanType: SignPlanType.AttachSpecificMarkingPlan,
      application: { connect: { caseNumber: 'APP-123' } },
      document: { connect: { uuid: 'document-1' } },
    };
    const result = { documentId: 'document-1' };
    prisma.signPlan.create.mockResolvedValue(result);

    await expect(repository.add(data)).resolves.toBe(result);
    expect(prisma.signPlan.create).toHaveBeenCalledWith({ data });
  });

  it('gets a sign plan by document uuid', async () => {
    const result = { documentId: 'document-1' };
    prisma.signPlan.findUniqueOrThrow.mockResolvedValue(result);

    await expect(repository.getById('document-1')).resolves.toBe(result);
    expect(prisma.signPlan.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { documentId: 'document-1' },
    });
  });
});
