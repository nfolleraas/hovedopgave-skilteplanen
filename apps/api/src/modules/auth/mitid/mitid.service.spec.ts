import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthTransaction } from '../../../generated/prisma/client.js';
import type { AuthTransactionService } from './auth-transaction.service.js';
import { MitidService } from './mitid.service.js';
import type { SignicatProvider } from './signicat.provider.js';

describe('MitidService', () => {
  let transactions: {
    create: ReturnType<typeof vi.fn>;
    consume: ReturnType<typeof vi.fn>;
  };
  let signicat: {
    createAuthorizationUrl: ReturnType<typeof vi.fn>;
    completeAuthorization: ReturnType<typeof vi.fn>;
  };
  let service: MitidService;

  beforeEach(() => {
    transactions = {
      create: vi.fn().mockResolvedValue({
        state: 'raw-state',
        nonce: 'raw-nonce',
        codeChallenge: 'pkce-challenge',
      }),
      consume: vi.fn(),
    };
    signicat = {
      createAuthorizationUrl: vi
        .fn()
        .mockResolvedValue('https://signicat.example/authorize'),
      completeAuthorization: vi.fn().mockResolvedValue({
        issuer: 'https://signicat.example',
        subject: 'provider-subject',
        claims: {},
      }),
    };
    service = new MitidService(
      transactions as unknown as AuthTransactionService,
      signicat as unknown as SignicatProvider,
    );
  });

  it('starts private login with a validated local return path', async () => {
    await expect(service.startPrivate('/applications/123')).resolves.toBe(
      'https://signicat.example/authorize',
    );

    expect(transactions.create).toHaveBeenCalledWith(
      'PRIVATE_APPLICANT',
      '/applications/123',
    );
    expect(signicat.createAuthorizationUrl).toHaveBeenCalledWith({
      loginType: 'PRIVATE_APPLICANT',
      state: 'raw-state',
      nonce: 'raw-nonce',
      codeChallenge: 'pkce-challenge',
    });
  });

  it('uses the business login context and rejects external return URLs', async () => {
    await service.startBusiness();
    expect(transactions.create).toHaveBeenCalledWith(
      'BUSINESS_APPLICANT',
      null,
    );

    await expect(
      service.startBusiness('https://attacker.example'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.startBusiness('//attacker.example'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a generic unavailable response when Signicat cannot start', async () => {
    signicat.createAuthorizationUrl.mockRejectedValue(new Error('network'));

    await expect(service.startPrivate()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('consumes the transaction and validates the authorization code', async () => {
    transactions.consume.mockResolvedValue(
      storedTransaction({ returnPath: '/applications' }),
    );

    await expect(
      service.callback({
        state: 'returned-state',
        code: 'authorization-code',
        error: undefined,
      }),
    ).resolves.toMatchObject({
      loginType: 'PRIVATE_APPLICANT',
      returnPath: '/applications',
      identity: { subject: 'provider-subject' },
    });
    expect(transactions.consume).toHaveBeenCalledWith('returned-state');
    expect(signicat.completeAuthorization).toHaveBeenCalledWith(
      'authorization-code',
      'pkce-verifier',
      'stored-nonce-hash',
    );
  });

  it('consumes provider errors without attempting a token exchange', async () => {
    transactions.consume.mockResolvedValue(storedTransaction());

    await expect(
      service.callback({
        state: 'returned-state',
        code: undefined,
        error: 'access_denied',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(signicat.completeAuthorization).not.toHaveBeenCalled();
  });

  it('returns a generic authentication error for invalid provider tokens', async () => {
    transactions.consume.mockResolvedValue(storedTransaction());
    signicat.completeAuthorization.mockRejectedValue(
      new Error('nonce mismatch'),
    );

    await expect(
      service.callback({
        state: 'returned-state',
        code: 'authorization-code',
        error: undefined,
      }),
    ).rejects.toMatchObject({
      message: 'Invalid identity provider response.',
    });
  });
});

function storedTransaction(
  overrides: Partial<AuthTransaction> = {},
): AuthTransaction {
  return {
    uuid: 'transaction-1',
    provider: 'SIGNICAT',
    loginType: 'PRIVATE_APPLICANT',
    stateHash: 'stored-state-hash',
    nonceHash: 'stored-nonce-hash',
    pkceVerifier: 'pkce-verifier',
    returnPath: null,
    createdAt: new Date('2026-11-18T12:00:00.000Z'),
    expiresAt: new Date('2026-11-18T12:10:00.000Z'),
    consumedAt: new Date('2026-11-18T12:01:00.000Z'),
    ...overrides,
  };
}
