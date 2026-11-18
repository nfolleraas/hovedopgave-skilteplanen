import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthTransaction } from '../../../generated/prisma/client.js';
import type { RefreshTokenService } from '../refresh-token/refresh-token.service.js';
import type { AuthTransactionService } from './auth-transaction.service.js';
import { MitidService } from './mitid.service.js';
import type { MitidApplicantRepository } from './mitid-applicant.repository.js';
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
  let applicants: {
    findPrivateByMitidKey: ReturnType<typeof vi.fn>;
    findBusinessByCvr: ReturnType<typeof vi.fn>;
  };
  let refreshTokens: { issue: ReturnType<typeof vi.fn> };
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
        mitidUuid: 'f5276262-9145-4616-8faf-23e8e683d665',
      }),
    };
    applicants = {
      findPrivateByMitidKey: vi.fn().mockResolvedValue(null),
      findBusinessByCvr: vi.fn().mockResolvedValue(null),
    };
    refreshTokens = {
      issue: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        refreshTokenExpiresAt: new Date('2026-11-25T12:00:00.000Z'),
      }),
    };
    service = new MitidService(
      transactions as unknown as AuthTransactionService,
      signicat as unknown as SignicatProvider,
      applicants as unknown as MitidApplicantRepository,
      refreshTokens as unknown as RefreshTokenService,
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
      status: 'registration-required',
    });
    expect(transactions.consume).toHaveBeenCalledWith('returned-state');
    expect(signicat.completeAuthorization).toHaveBeenCalledWith(
      'authorization-code',
      'pkce-verifier',
      'stored-nonce-hash',
    );
    expect(applicants.findPrivateByMitidKey).toHaveBeenCalledWith(
      'f5276262-9145-4616-8faf-23e8e683d665',
    );
  });

  it('issues an applicant session for an active private applicant', async () => {
    transactions.consume.mockResolvedValue(storedTransaction());
    applicants.findPrivateByMitidKey.mockResolvedValue({
      uuid: 'applicant-123',
      isActive: true,
    });

    await expect(
      service.callback({
        state: 'returned-state',
        code: 'authorization-code',
        error: undefined,
      }),
    ).resolves.toMatchObject({
      status: 'authenticated',
      session: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
    expect(refreshTokens.issue).toHaveBeenCalledWith({
      subject: 'applicant-123',
      actor: 'APPLICANT',
    });
  });

  it('denies an inactive private applicant without issuing a session', async () => {
    transactions.consume.mockResolvedValue(storedTransaction());
    applicants.findPrivateByMitidKey.mockResolvedValue({
      uuid: 'applicant-123',
      isActive: false,
    });

    await expect(
      service.callback({
        state: 'returned-state',
        code: 'authorization-code',
        error: undefined,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(refreshTokens.issue).not.toHaveBeenCalled();
  });

  it('rejects private login without the stable MitID UUID claim', async () => {
    transactions.consume.mockResolvedValue(storedTransaction());
    signicat.completeAuthorization.mockResolvedValue({
      issuer: 'https://signicat.example',
      subject: 'provider-subject',
    });

    await expect(
      service.callback({
        state: 'returned-state',
        code: 'authorization-code',
        error: undefined,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(applicants.findPrivateByMitidKey).not.toHaveBeenCalled();
  });

  it('returns registration-required for an unknown verified business', async () => {
    transactions.consume.mockResolvedValue(
      storedTransaction({ loginType: 'BUSINESS_APPLICANT' }),
    );
    signicat.completeAuthorization.mockResolvedValue({
      issuer: 'https://signicat.example',
      subject: 'provider-subject',
      organisationCvr: '95338926',
      employeeUuid: 'eea6df96-c347-4cd3-ab08-7df0af052e83',
    });

    await expect(
      service.callback({
        state: 'returned-state',
        code: 'authorization-code',
        error: undefined,
      }),
    ).resolves.toMatchObject({
      loginType: 'BUSINESS_APPLICANT',
      status: 'registration-required',
    });
    expect(applicants.findPrivateByMitidKey).not.toHaveBeenCalled();
    expect(applicants.findBusinessByCvr).toHaveBeenCalledWith('95338926');
    expect(refreshTokens.issue).not.toHaveBeenCalled();
  });

  it('issues an applicant session for an active business applicant', async () => {
    transactions.consume.mockResolvedValue(
      storedTransaction({ loginType: 'BUSINESS_APPLICANT' }),
    );
    signicat.completeAuthorization.mockResolvedValue({
      issuer: 'https://signicat.example',
      subject: 'provider-subject',
      organisationCvr: '95338926',
      employeeUuid: 'eea6df96-c347-4cd3-ab08-7df0af052e83',
    });
    applicants.findBusinessByCvr.mockResolvedValue({
      uuid: 'business-applicant-123',
      isActive: true,
    });

    await expect(
      service.callback({
        state: 'returned-state',
        code: 'authorization-code',
        error: undefined,
      }),
    ).resolves.toMatchObject({
      loginType: 'BUSINESS_APPLICANT',
      status: 'authenticated',
      identity: {
        organisationCvr: '95338926',
        employeeUuid: 'eea6df96-c347-4cd3-ab08-7df0af052e83',
      },
      session: { accessToken: 'access-token' },
    });
    expect(refreshTokens.issue).toHaveBeenCalledWith({
      subject: 'business-applicant-123',
      actor: 'APPLICANT',
    });
  });

  it('denies an inactive business applicant without issuing a session', async () => {
    transactions.consume.mockResolvedValue(
      storedTransaction({ loginType: 'BUSINESS_APPLICANT' }),
    );
    signicat.completeAuthorization.mockResolvedValue({
      issuer: 'https://signicat.example',
      subject: 'provider-subject',
      organisationCvr: '95338926',
      employeeUuid: 'eea6df96-c347-4cd3-ab08-7df0af052e83',
    });
    applicants.findBusinessByCvr.mockResolvedValue({
      uuid: 'business-applicant-123',
      isActive: false,
    });

    await expect(
      service.callback({
        state: 'returned-state',
        code: 'authorization-code',
        error: undefined,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(refreshTokens.issue).not.toHaveBeenCalled();
  });

  it('rejects business login without employee relationship evidence', async () => {
    transactions.consume.mockResolvedValue(
      storedTransaction({ loginType: 'BUSINESS_APPLICANT' }),
    );
    signicat.completeAuthorization.mockResolvedValue({
      issuer: 'https://signicat.example',
      subject: 'provider-subject',
      organisationCvr: '95338926',
    });

    await expect(
      service.callback({
        state: 'returned-state',
        code: 'authorization-code',
        error: undefined,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(applicants.findBusinessByCvr).not.toHaveBeenCalled();
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
