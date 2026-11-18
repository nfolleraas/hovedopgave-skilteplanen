import { Module } from '@nestjs/common';
import { AUTH_CONFIG, authConfig } from '../../config/auth.config.js';
import { JwtService } from './jwt/jwt.service.js';
import { RefreshTokenRepository } from './refresh-token/refresh-token.repository.js';
import { RefreshTokenService } from './refresh-token/refresh-token.service.js';

@Module({
  providers: [
    JwtService,
    RefreshTokenRepository,
    RefreshTokenService,
    { provide: AUTH_CONFIG, useValue: authConfig },
  ],
  exports: [AUTH_CONFIG, JwtService, RefreshTokenService],
})
export class SessionModule {}
