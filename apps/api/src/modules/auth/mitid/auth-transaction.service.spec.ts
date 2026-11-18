import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthTransaction } from '../../../generated/prisma/client.js';
import type { AuthTransactionRepository } from './auth-transaction.repository.js';
import { AuthTransactionService } from './auth-transaction.service.js';

const NOW = new Date('2026-11-18T12:00:00.000Z');

describe('AuthTransactionService', () => {
  let repository: {
    create: ReturnType<typeof vi.fn>;
    consume: ReturnType<typeof vi.fn>;
  };
  let service: AuthTransactionService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    repository = {
      create: vi.fn().mockResolvedValue({}),
      consume: vi.fn(),
    };
    service = new AuthTransactionService(
      repository as unknown as AuthTransactionRepository,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores only state and nonce hashes and creates an S256 challenge', async () => {
    const result = await service.create('PRIVATE_APPLICANT', '/applications');
    const stored = repository.create.mock.calls[0][0];

    expect(result.state).toHaveLength(43);
    expect(result.nonce).toHaveLength(43);
    expect(stored).toEqual({
      loginType: 'PRIVATE_APPLICANT',
      stateHash: sha256Hex(result.state),
      nonceHash: sha256Hex(result.nonce),
      pkceVerifier: expect.any(String),
      returnPath: '/applications',
      expiresAt: new Date('2026-11-18T12:10:00.000Z'),
    });
    expect(stored.pkceVerifier).toHaveLength(43);
    expect(result.codeChallenge).toBe(
      createHash('sha256').update(stored.pkceVerifier).digest('base64url'),
    );
    expect(JSON.stringify(stored)).not.toContain(result.state);
    expect(JSON.stringify(stored)).not.toContain(result.nonce);
  });

  it('consumes a transaction by its state hash', async () => {
    const transaction = { uuid: 'transaction-1' } as AuthTransaction;
    repository.consume.mockResolvedValue(transaction);

    await expect(service.consume('returned-state')).resolves.toBe(transaction);
    expect(repository.consume).toHaveBeenCalledWith(
      sha256Hex('returned-state'),
      NOW,
    );
  });

  it('rejects missing, expired, or already-consumed state generically', async () => {
    repository.consume.mockResolvedValue(null);

    await expect(service.consume(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.consume('unknown-state')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
