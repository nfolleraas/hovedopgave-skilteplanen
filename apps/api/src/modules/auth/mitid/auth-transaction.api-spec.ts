import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthTransactionRepository } from './auth-transaction.repository.js';

describe('OIDC authorization transaction persistence', () => {
  let moduleFixture: TestingModule;
  let prisma: PrismaService;
  let repository: AuthTransactionRepository;
  const stateHashes: string[] = [];

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [AuthTransactionRepository],
    }).compile();
    prisma = moduleFixture.get(PrismaService);
    repository = moduleFixture.get(AuthTransactionRepository);
  });

  afterEach(async () => {
    await prisma.authTransaction.deleteMany({
      where: { stateHash: { in: stateHashes.splice(0) } },
    });
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  it('allows exactly one concurrent callback to consume a transaction', async () => {
    const stateHash = randomUUID();
    stateHashes.push(stateHash);
    await createTransaction(stateHash, new Date(Date.now() + 60_000));
    const consumedAt = new Date();

    const results = await Promise.all([
      repository.consume(stateHash, consumedAt),
      repository.consume(stateHash, consumedAt),
    ]);

    expect(results.filter((result) => result !== null)).toHaveLength(1);
    expect(results.filter((result) => result === null)).toHaveLength(1);
    await expect(
      prisma.authTransaction.findUniqueOrThrow({ where: { stateHash } }),
    ).resolves.toMatchObject({ consumedAt });
  });

  it('does not consume an expired transaction', async () => {
    const stateHash = randomUUID();
    stateHashes.push(stateHash);
    await createTransaction(stateHash, new Date(Date.now() - 1_000));

    await expect(repository.consume(stateHash, new Date())).resolves.toBeNull();
  });

  async function createTransaction(
    stateHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await repository.create({
      loginType: 'PRIVATE_APPLICANT',
      stateHash,
      nonceHash: randomUUID(),
      pkceVerifier: randomUUID(),
      returnPath: null,
      expiresAt,
    });
  }
});
