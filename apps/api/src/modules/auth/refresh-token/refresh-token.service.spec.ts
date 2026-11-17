import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthConfig } from '../../../config/auth.config.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtService } from '../jwt/jwt.service.js';
import { RefreshTokenRepository } from './refresh-token.repository.js';
import { RefreshTokenService } from './refresh-token.service.js';

vi.hoisted(() => {
  process.env.AUTH_JWT_SECRET = 'test-secret-with-at-least-32-characters';
  process.env.AUTH_JWT_ISSUER = 'ansoegningsplatformen-api';
  process.env.AUTH_JWT_AUDIENCE = 'ansoegningsplatformen-web';
  process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS = '600';
  process.env.AUTH_ONBOARDING_TOKEN_TTL_SECONDS = '900';
  process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS = '604800';
  process.env.AUTH_ACCESS_COOKIE_NAME = 'sk_access';
  process.env.AUTH_REFRESH_COOKIE_NAME = 'sk_refresh';
  process.env.AUTH_ACCESS_COOKIE_PATH = '/api';
  process.env.AUTH_REFRESH_COOKIE_PATH = '/api/auth/refresh';
  process.env.AUTH_COOKIE_SECURE = 'false';
});

const NOW = new Date('2026-11-17T12:00:00.000Z');

const config: AuthConfig = {
  jwt: {
    algorithm: 'HS256',
    secret: 'test-secret-with-at-least-32-characters',
    issuer: 'ansoegningsplatformen-api',
    audience: 'ansoegningsplatformen-web',
    accessTokenTtlSeconds: 600,
    onboardingTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
  },
  cookies: {
    accessName: 'sk_access',
    refreshName: 'sk_refresh',
    accessPath: '/api',
    refreshPath: '/api/auth/refresh',
    secure: false,
    sameSite: 'lax',
  },
};

type TransactionMock = {
  refreshToken: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  applicant: { findUnique: ReturnType<typeof vi.fn> };
  caseWorker: { findUnique: ReturnType<typeof vi.fn> };
  administrator: { findUnique: ReturnType<typeof vi.fn> };
  authAuditEvent: { create: ReturnType<typeof vi.fn> };
};

type StoredRefreshToken = {
  uuid: string;
  tokenHash: string;
  principalId: string;
  actor: 'APPLICANT' | 'CASE_WORKER' | 'ADMINISTRATOR';
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
};

/**
 * Hashes a raw token using the production storage format.
 * @param token - The opaque token returned by the service.
 * @returns The expected persisted SHA-256 hash.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a persisted refresh-token record for a unit test.
 * @param overrides - Fields that should differ from the valid default record.
 * @returns A refresh-token row returned by the Prisma mock.
 */
function createStoredToken(
  overrides: Partial<StoredRefreshToken> = {},
): StoredRefreshToken {
  return {
    uuid: 'refresh-token-1',
    tokenHash: hashToken('current-refresh-token'),
    principalId: 'applicant-123',
    actor: 'APPLICANT',
    createdAt: NOW,
    expiresAt: new Date('2026-11-24T12:00:00.000Z'),
    revokedAt: null,
    replacedById: null,
    ...overrides,
  };
}

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let transaction: TransactionMock;
  let prisma: { $transaction: ReturnType<typeof vi.fn> };
  let jwtService: { createAccessToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    transaction = {
      refreshToken: {
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      applicant: { findUnique: vi.fn() },
      caseWorker: { findUnique: vi.fn() },
      administrator: { findUnique: vi.fn() },
      authAuditEvent: { create: vi.fn() },
    };
    prisma = {
      $transaction: vi.fn(
        async (callback: (client: TransactionMock) => Promise<unknown>) =>
          callback(transaction),
      ),
    };
    jwtService = {
      createAccessToken: vi.fn().mockReturnValue('access-token'),
    };
    service = new RefreshTokenService(
      new RefreshTokenRepository(prisma as unknown as PrismaService),
      jwtService as unknown as JwtService,
      config,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('issues an opaque refresh token and stores only its hash', async () => {
    transaction.applicant.findUnique.mockResolvedValue({ isActive: true });
    transaction.refreshToken.create.mockResolvedValue(createStoredToken());

    const result = await service.issue({
      subject: 'applicant-123',
      actor: 'APPLICANT',
    });

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toHaveLength(43);
    expect(result.refreshTokenExpiresAt).toEqual(
      new Date('2026-11-24T12:00:00.000Z'),
    );
    expect(transaction.refreshToken.create).toHaveBeenCalledWith({
      data: {
        tokenHash: hashToken(result.refreshToken),
        principalId: 'applicant-123',
        actor: 'APPLICANT',
        expiresAt: result.refreshTokenExpiresAt,
      },
    });
    expect(
      JSON.stringify(transaction.refreshToken.create.mock.calls),
    ).not.toContain(result.refreshToken);
  });

  it('does not issue tokens for an inactive applicant', async () => {
    transaction.applicant.findUnique.mockResolvedValue({ isActive: false });

    await expect(
      service.issue({ subject: 'applicant-123', actor: 'APPLICANT' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transaction.refreshToken.create).not.toHaveBeenCalled();
    expect(jwtService.createAccessToken).not.toHaveBeenCalled();
  });

  it('rotates a valid token and retains the original session expiry', async () => {
    const storedToken = createStoredToken();
    transaction.refreshToken.findUnique.mockResolvedValue(storedToken);
    transaction.applicant.findUnique.mockResolvedValue({ isActive: true });
    transaction.refreshToken.create.mockResolvedValue(storedToken);
    transaction.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    transaction.authAuditEvent.create.mockResolvedValue({});

    const result = await service.rotate('current-refresh-token');
    const replacementData =
      transaction.refreshToken.create.mock.calls[0][0].data;

    expect(transaction.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken('current-refresh-token') },
    });
    expect(replacementData.tokenHash).toBe(hashToken(result.refreshToken));
    expect(replacementData.tokenHash).not.toBe(result.refreshToken);
    expect(replacementData.expiresAt).toEqual(storedToken.expiresAt);
    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        uuid: storedToken.uuid,
        revokedAt: null,
        replacedById: null,
        expiresAt: { gt: NOW },
      },
      data: {
        revokedAt: NOW,
        replacedById: replacementData.uuid,
      },
    });
    expect(result).toMatchObject({
      accessToken: 'access-token',
      refreshTokenExpiresAt: storedToken.expiresAt,
    });
    expect(transaction.authAuditEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: 'REFRESH_SUCCESS',
        actor: 'APPLICANT',
        principalId: 'applicant-123',
        success: true,
      },
    });
  });

  it('rejects and audits reuse of an already rotated token', async () => {
    transaction.refreshToken.findUnique.mockResolvedValue(
      createStoredToken({
        revokedAt: new Date('2026-11-17T11:00:00.000Z'),
        replacedById: 'refresh-token-2',
      }),
    );
    transaction.authAuditEvent.create.mockResolvedValue({});

    await expect(
      service.rotate('current-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transaction.refreshToken.create).not.toHaveBeenCalled();
    expect(transaction.authAuditEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: 'REFRESH_REUSE',
        actor: 'APPLICANT',
        principalId: 'applicant-123',
        success: false,
      },
    });
  });

  it('rejects and audits an expired refresh token', async () => {
    transaction.refreshToken.findUnique.mockResolvedValue(
      createStoredToken({
        expiresAt: new Date('2026-11-17T11:59:59.000Z'),
      }),
    );
    transaction.authAuditEvent.create.mockResolvedValue({});

    await expect(
      service.rotate('current-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transaction.applicant.findUnique).not.toHaveBeenCalled();
    expect(transaction.authAuditEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: 'REFRESH_FAILURE',
        actor: 'APPLICANT',
        principalId: 'applicant-123',
        success: false,
        metadata: { reason: 'expired' },
      },
    });
  });

  it('rejects refresh when the principal no longer exists', async () => {
    transaction.refreshToken.findUnique.mockResolvedValue(createStoredToken());
    transaction.applicant.findUnique.mockResolvedValue(null);
    transaction.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    transaction.authAuditEvent.create.mockResolvedValue({});

    await expect(
      service.rotate('current-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(transaction.refreshToken.create).not.toHaveBeenCalled();
    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { uuid: 'refresh-token-1', revokedAt: null },
      data: { revokedAt: NOW },
    });
    expect(transaction.authAuditEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: 'REFRESH_FAILURE',
        actor: 'APPLICANT',
        principalId: 'applicant-123',
        success: false,
        metadata: { reason: 'principal_unavailable' },
      },
    });
  });

  it('removes a losing replacement when concurrent rotation is detected', async () => {
    transaction.refreshToken.findUnique.mockResolvedValue(createStoredToken());
    transaction.applicant.findUnique.mockResolvedValue({ isActive: true });
    transaction.refreshToken.create.mockResolvedValue(createStoredToken());
    transaction.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    transaction.refreshToken.delete.mockResolvedValue(createStoredToken());
    transaction.authAuditEvent.create.mockResolvedValue({});

    await expect(
      service.rotate('current-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const replacementId =
      transaction.refreshToken.create.mock.calls[0][0].data.uuid;
    expect(transaction.refreshToken.delete).toHaveBeenCalledWith({
      where: { uuid: replacementId },
    });
    expect(transaction.authAuditEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: 'REFRESH_REUSE',
        actor: 'APPLICANT',
        principalId: 'applicant-123',
        success: false,
      },
    });
  });

  it('revokes one token and records logout', async () => {
    transaction.refreshToken.findUnique.mockResolvedValue(createStoredToken());
    transaction.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    transaction.authAuditEvent.create.mockResolvedValue({});

    await service.revoke('current-refresh-token');

    expect(transaction.refreshToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken('current-refresh-token') },
    });
    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { uuid: 'refresh-token-1', revokedAt: null },
      data: { revokedAt: NOW },
    });
    expect(transaction.authAuditEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: 'LOGOUT',
        actor: 'APPLICANT',
        principalId: 'applicant-123',
        success: true,
      },
    });
  });

  it('revokes all active tokens for a principal', async () => {
    transaction.refreshToken.updateMany.mockResolvedValue({ count: 2 });
    transaction.authAuditEvent.create.mockResolvedValue({});

    await expect(
      service.revokeAll({ subject: 'case-worker-7', actor: 'CASE_WORKER' }),
    ).resolves.toBe(2);
    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        principalId: 'case-worker-7',
        actor: 'CASE_WORKER',
        revokedAt: null,
      },
      data: { revokedAt: NOW },
    });
    expect(transaction.authAuditEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: 'LOGOUT',
        actor: 'CASE_WORKER',
        principalId: 'case-worker-7',
        success: true,
        metadata: { scope: 'all', revokedTokenCount: 2 },
      },
    });
  });
});
