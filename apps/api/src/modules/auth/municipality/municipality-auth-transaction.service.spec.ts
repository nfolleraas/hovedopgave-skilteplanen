import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthTransaction } from '../../../generated/prisma/client.js';
import type { MunicipalityAuthTransactionRepository } from './municipality-auth-transaction.repository.js';
import { MunicipalityAuthTransactionService } from './municipality-auth-transaction.service.js';

const NOW = new Date('2026-11-23T12:00:00.000Z');

describe('MunicipalityAuthTransactionService', () => {
  let repository: {
    create: ReturnType<typeof vi.fn>;
    consume: ReturnType<typeof vi.fn>;
  };
  let service: MunicipalityAuthTransactionService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    repository = {
      create: vi.fn().mockResolvedValue({}),
      consume: vi.fn(),
    };
    service = new MunicipalityAuthTransactionService(
      repository as unknown as MunicipalityAuthTransactionRepository,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores hashes and creates an S256 PKCE challenge', async () => {
    const result = await service.create('/cases');
    const stored = repository.create.mock.calls[0][0];

    expect(stored).toEqual({
      stateHash: sha256Hex(result.state),
      nonceHash: sha256Hex(result.nonce),
      pkceVerifier: expect.any(String),
      returnPath: '/cases',
      expiresAt: new Date('2026-11-23T12:10:00.000Z'),
    });
    expect(result.codeChallenge).toBe(
      createHash('sha256').update(stored.pkceVerifier).digest('base64url'),
    );
  });

  it('consumes state once and rejects invalid state generically', async () => {
    const transaction = { uuid: 'transaction-1' } as AuthTransaction;
    repository.consume
      .mockResolvedValueOnce(transaction)
      .mockResolvedValue(null);

    await expect(service.consume('returned-state')).resolves.toBe(transaction);
    expect(repository.consume).toHaveBeenCalledWith(
      sha256Hex('returned-state'),
      NOW,
    );
    await expect(service.consume('returned-state')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.consume(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
