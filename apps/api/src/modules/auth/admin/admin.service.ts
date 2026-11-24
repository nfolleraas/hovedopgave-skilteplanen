import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordService } from '../password/password.service.js';
import { RefreshTokenService } from '../refresh-token/refresh-token.service.js';
import { AdminRepository } from './admin.repository.js';
import type { AdminLoginInput, AdminLoginSession } from './admin.types.js';
import { AdminLoginRateLimiter } from './admin-login-rate-limiter.service.js';

// Verifying this known hash gives unknown accounts comparable password-check timing.
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$fkPMcpAYUOwKjDzegv0/KQ$5za20NPtns8Txy9PGpN18lyQCRgn4tEnMsqY2LCnoS8';

@Injectable()
export class AdminService {
  /**
   * Creates the local administrator authentication service.
   * @param repository - The administrator data and audit-event repository.
   * @param passwordService - The API-only Argon2id password verifier.
   * @param rateLimiter - The endpoint and account login-attempt limiter.
   * @param refreshTokenService - The service that issues authenticated sessions.
   */
  constructor(
    private readonly repository: AdminRepository,
    private readonly passwordService: PasswordService,
    private readonly rateLimiter: AdminLoginRateLimiter,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Authenticates an administrator and creates a rotating browser session.
   * @param input - The untrusted credential and request-source values.
   * @returns The access and refresh tokens for a verified administrator.
   * @throws HttpException when login attempts are rate-limited.
   * @throws UnauthorizedException when the credentials are invalid.
   */
  async login(input: AdminLoginInput): Promise<AdminLoginSession> {
    const email = normalizeEmail(input.email);
    const password = typeof input.password === 'string' ? input.password : '';

    if (!this.rateLimiter.isAllowed(email, input.ipAddress)) {
      await this.repository.recordLoginFailure(
        undefined,
        input.ipAddress,
        'rate_limited',
      );
      throw new HttpException(
        'Too many login attempts. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const administrator =
      email.length === 0 ? null : await this.repository.findByEmail(email);
    const passwordHash = administrator?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const passwordIsValid = await this.passwordService.verify(
      password,
      passwordHash,
    );

    if (!administrator || !passwordIsValid) {
      this.rateLimiter.recordFailure(email, input.ipAddress);
      await this.repository.recordLoginFailure(
        administrator?.uuid,
        input.ipAddress,
        'invalid_credentials',
      );
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = await this.refreshTokenService.issue({
      subject: administrator.uuid,
      actor: 'ADMINISTRATOR',
    });

    this.rateLimiter.reset(email, input.ipAddress);
    await this.repository.recordLoginSuccess(
      administrator.uuid,
      input.ipAddress,
    );

    return tokens;
  }
}

/**
 * Normalizes an untrusted e-mail value for unique local-account lookup.
 * @param email - The untrusted e-mail value from a login request.
 * @returns The trimmed lowercase e-mail, or an empty string for non-strings.
 */
export function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}
