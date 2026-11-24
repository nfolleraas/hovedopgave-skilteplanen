import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { KeycloakConfig } from '../../../config/keycloak.config.js';
import type { AuthTransaction } from '../../../generated/prisma/client.js';
import type { RefreshTokenService } from '../refresh-token/refresh-token.service.js';
import type { KeycloakProvider } from './keycloak.provider.js';
import { MunicipalityService } from './municipality.service.js';
import type { MunicipalityAuditRepository } from './municipality-audit.repository.js';
import type { MunicipalityAuthTransactionService } from './municipality-auth-transaction.service.js';
import type { MunicipalityCaseWorkerRepository } from './municipality-case-worker.repository.js';

const config: KeycloakConfig = {
  enabled: true,
  issuerUrl: 'http://localhost:8080/realms/demo-municipality',
  discoveryUrl:
    'http://keycloak:8080/realms/demo-municipality/.well-known/openid-configuration',
  backchannelRealmUrl: 'http://keycloak:8080/realms/demo-municipality',
  clientId: 'municipal-api',
  clientSecret: 'client-secret',
  redirectUri: 'http://localhost:5173/api/auth/municipality/callback',
  scopes: ['openid', 'profile'],
  requiredRole: 'caseworker',
};

describe('MunicipalityService', () => {
  let transactions: {
    create: ReturnType<typeof vi.fn>;
    consume: ReturnType<typeof vi.fn>;
  };
  let keycloak: {
    createAuthorizationUrl: ReturnType<typeof vi.fn>;
    completeAuthorization: ReturnType<typeof vi.fn>;
  };
  let caseWorkers: { findLinkedIdentity: ReturnType<typeof vi.fn> };
  let audit: { recordLoginSuccess: ReturnType<typeof vi.fn> };
  let refreshTokens: { issue: ReturnType<typeof vi.fn> };
  let service: MunicipalityService;

  beforeEach(() => {
    transactions = {
      create: vi.fn().mockResolvedValue({
        state: 'raw-state',
        nonce: 'raw-nonce',
        codeChallenge: 'pkce-challenge',
      }),
      consume: vi.fn().mockResolvedValue(storedTransaction()),
    };
    keycloak = {
      createAuthorizationUrl: vi
        .fn()
        .mockResolvedValue('http://localhost:8080/authorize'),
      completeAuthorization: vi.fn().mockResolvedValue({
        issuer: config.issuerUrl,
        subject: 'keycloak-user-id',
        municipalityClaim: 'demo-kommune',
        roles: ['municipal-employee', 'caseworker'],
      }),
    };
    caseWorkers = {
      findLinkedIdentity: vi.fn().mockResolvedValue({
        caseWorker: { employeeNumber: 'employee-1', municipalityId: 10 },
        municipalityProvider: { municipalityId: 10 },
      }),
    };
    audit = { recordLoginSuccess: vi.fn().mockResolvedValue(undefined) };
    refreshTokens = {
      issue: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        refreshTokenExpiresAt: new Date('2026-11-30T12:00:00.000Z'),
      }),
    };
    service = new MunicipalityService(
      transactions as unknown as MunicipalityAuthTransactionService,
      keycloak as unknown as KeycloakProvider,
      caseWorkers as unknown as MunicipalityCaseWorkerRepository,
      audit as unknown as MunicipalityAuditRepository,
      refreshTokens as unknown as RefreshTokenService,
      config,
    );
  });

  it('starts login with a validated local return path', async () => {
    await expect(service.start('/cases/123')).resolves.toBe(
      'http://localhost:8080/authorize',
    );
    expect(transactions.create).toHaveBeenCalledWith('/cases/123');
    expect(keycloak.createAuthorizationUrl).toHaveBeenCalledWith({
      state: 'raw-state',
      nonce: 'raw-nonce',
      codeChallenge: 'pkce-challenge',
    });
  });

  it('rejects external return paths and unavailable Keycloak', async () => {
    await expect(
      service.start('https://attacker.example'),
    ).rejects.toBeInstanceOf(BadRequestException);
    keycloak.createAuthorizationUrl.mockRejectedValue(new Error('network'));
    await expect(service.start()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('issues and audits a session for a linked case worker', async () => {
    await expect(
      service.callback({
        state: 'returned-state',
        code: 'authorization-code',
        error: undefined,
      }),
    ).resolves.toMatchObject({
      loginType: 'MUNICIPALITY',
      returnPath: '/cases',
      status: 'authenticated',
      session: { accessToken: 'access-token' },
    });
    expect(keycloak.completeAuthorization).toHaveBeenCalledWith(
      'authorization-code',
      'pkce-verifier',
      'stored-nonce-hash',
    );
    expect(refreshTokens.issue).toHaveBeenCalledWith({
      subject: 'employee-1',
      actor: 'CASE_WORKER',
    });
    expect(audit.recordLoginSuccess).toHaveBeenCalledWith(
      'employee-1',
      expect.objectContaining({ subject: 'keycloak-user-id' }),
    );
  });

  it('denies an employee without the required Keycloak role', async () => {
    keycloak.completeAuthorization.mockResolvedValue({
      issuer: config.issuerUrl,
      subject: 'keycloak-user-id',
      municipalityClaim: 'demo-kommune',
      roles: ['municipal-employee'],
    });

    await expect(
      service.callback({
        state: 'returned-state',
        code: 'authorization-code',
        error: undefined,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(caseWorkers.findLinkedIdentity).not.toHaveBeenCalled();
    expect(refreshTokens.issue).not.toHaveBeenCalled();
  });

  it('denies unknown and municipality-mismatched identities', async () => {
    caseWorkers.findLinkedIdentity.mockResolvedValueOnce(null);
    await expect(
      service.callback({
        state: 'returned-state',
        code: 'authorization-code',
        error: undefined,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    caseWorkers.findLinkedIdentity.mockResolvedValueOnce({
      caseWorker: { employeeNumber: 'employee-1', municipalityId: 11 },
      municipalityProvider: { municipalityId: 10 },
    });
    await expect(
      service.callback({
        state: 'returned-state-2',
        code: 'authorization-code',
        error: undefined,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(refreshTokens.issue).not.toHaveBeenCalled();
  });

  it('consumes provider errors and hides token validation details', async () => {
    await expect(
      service.callback({
        state: 'returned-state',
        code: undefined,
        error: 'access_denied',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(keycloak.completeAuthorization).not.toHaveBeenCalled();

    keycloak.completeAuthorization.mockRejectedValue(new Error('bad nonce'));
    await expect(
      service.callback({
        state: 'returned-state',
        code: 'authorization-code',
        error: undefined,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

function storedTransaction(): AuthTransaction {
  return {
    uuid: 'transaction-1',
    provider: 'KEYCLOAK',
    loginType: 'MUNICIPALITY',
    stateHash: 'state-hash',
    nonceHash: 'stored-nonce-hash',
    pkceVerifier: 'pkce-verifier',
    returnPath: '/cases',
    createdAt: new Date('2026-11-23T12:00:00.000Z'),
    expiresAt: new Date('2026-11-23T12:10:00.000Z'),
    consumedAt: new Date('2026-11-23T12:01:00.000Z'),
  };
}
