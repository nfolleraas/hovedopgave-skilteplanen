import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AUTH_CONFIG, authConfig } from '../../config/auth.config.js';
import { AdminModule } from './admin/admin.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CaseWorkerModule } from './case-worker/case-worker.module.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { JwtService } from './jwt/jwt.service.js';
import { MitidModule } from './mitid/mitid.module.js';
import { MunicipalityModule } from './municipality/municipality.module.js';
import { RefreshTokenRepository } from './refresh-token/refresh-token.repository.js';
import { RefreshTokenService } from './refresh-token/refresh-token.service.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    RefreshTokenRepository,
    RefreshTokenService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: AUTH_CONFIG, useValue: authConfig },
  ],
  exports: [AUTH_CONFIG, JwtService, RefreshTokenService],
  imports: [MitidModule, MunicipalityModule, CaseWorkerModule, AdminModule],
})
export class AuthModule {}
