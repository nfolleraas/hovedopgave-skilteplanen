import { HttpException, UnauthorizedException } from '@nestjs/common';
import type { PasswordService } from '../password/password.service.js';
import type { RefreshTokenService } from '../refresh-token/refresh-token.service.js';
import type { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';
import { AdminLoginRateLimiter } from './admin-login-rate-limiter.service.js';

describe('AdminService', () => {
  let service: AdminService;
  let repository: {
    findByEmail: ReturnType<typeof vi.fn>;
    recordLoginSuccess: ReturnType<typeof vi.fn>;
    recordLoginFailure: ReturnType<typeof vi.fn>;
  };
  let passwordService: { verify: ReturnType<typeof vi.fn> };
  let rateLimiter: {
    isAllowed: ReturnType<typeof vi.fn>;
    recordFailure: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let refreshTokenService: { issue: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      findByEmail: vi.fn(),
      recordLoginSuccess: vi.fn().mockResolvedValue(undefined),
      recordLoginFailure: vi.fn().mockResolvedValue(undefined),
    };
    passwordService = { verify: vi.fn() };
    rateLimiter = {
      isAllowed: vi.fn().mockReturnValue(true),
      recordFailure: vi.fn(),
      reset: vi.fn(),
    };
    refreshTokenService = {
      issue: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        refreshTokenExpiresAt: new Date('2026-11-25T12:00:00.000Z'),
      }),
    };
    service = new AdminService(
      repository as unknown as AdminRepository,
      passwordService as unknown as PasswordService,
      rateLimiter as unknown as AdminLoginRateLimiter,
      refreshTokenService as unknown as RefreshTokenService,
    );
  });

  it('normalizes credentials, issues a session, and audits a successful login', async () => {
    repository.findByEmail.mockResolvedValue({
      uuid: 'admin-123',
      passwordHash: 'stored-hash',
    });
    passwordService.verify.mockResolvedValue(true);

    await expect(
      service.login({
        email: ' ADMIN@example.com ',
        password: 'correct-password',
        ipAddress: '127.0.0.1',
      }),
    ).resolves.toMatchObject({ accessToken: 'access-token' });

    expect(repository.findByEmail).toHaveBeenCalledWith('admin@example.com');
    expect(refreshTokenService.issue).toHaveBeenCalledWith({
      subject: 'admin-123',
      actor: 'ADMINISTRATOR',
    });
    expect(repository.recordLoginSuccess).toHaveBeenCalledWith(
      'admin-123',
      '127.0.0.1',
    );
    expect(rateLimiter.reset).toHaveBeenCalledWith(
      'admin@example.com',
      '127.0.0.1',
    );
  });

  it('uses the same generic response for missing and invalid credentials', async () => {
    repository.findByEmail.mockResolvedValueOnce(null);
    passwordService.verify.mockResolvedValue(false);

    await expect(
      service.login({ email: 'missing@example.com', password: 'password' }),
    ).rejects.toMatchObject({ message: 'Invalid email or password.' });
    expect(repository.recordLoginFailure).toHaveBeenCalledWith(
      undefined,
      undefined,
      'invalid_credentials',
    );

    repository.findByEmail.mockResolvedValueOnce({
      uuid: 'admin-123',
      passwordHash: 'stored-hash',
    });
    passwordService.verify.mockResolvedValue(false);

    await expect(
      service.login({ email: 'admin@example.com', password: 'wrong-password' }),
    ).rejects.toMatchObject({ message: 'Invalid email or password.' });
    expect(repository.recordLoginFailure).toHaveBeenLastCalledWith(
      'admin-123',
      undefined,
      'invalid_credentials',
    );
    expect(refreshTokenService.issue).not.toHaveBeenCalled();
  });

  it('rejects rate-limited attempts before looking up an administrator', async () => {
    rateLimiter.isAllowed.mockReturnValue(false);

    await expect(
      service.login({
        email: 'admin@example.com',
        password: 'password',
        ipAddress: '127.0.0.1',
      }),
    ).rejects.toMatchObject<HttpException>({ status: 429 });

    expect(repository.findByEmail).not.toHaveBeenCalled();
    expect(repository.recordLoginFailure).toHaveBeenCalledWith(
      undefined,
      '127.0.0.1',
      'rate_limited',
    );
  });

  it('returns an unauthorized error for an invalid input shape', async () => {
    passwordService.verify.mockResolvedValue(false);

    await expect(
      service.login({ email: null, password: null }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.findByEmail).not.toHaveBeenCalled();
  });
});
