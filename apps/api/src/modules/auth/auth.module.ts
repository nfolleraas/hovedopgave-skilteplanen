import { Module } from '@nestjs/common';
import { AUTH_CONFIG, authConfig } from '../../config/auth.config.js';
import { AdminModule } from './admin/admin.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CaseWorkerModule } from './case-worker/case-worker.module.js';
import { JwtService } from './jwt/jwt.service.js';
import { MitidModule } from './mitid/mitid.module.js';
import { MunicipalityModule } from './municipality/municipality.module.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    { provide: AUTH_CONFIG, useValue: authConfig },
  ],
  exports: [AUTH_CONFIG, JwtService],
  imports: [MitidModule, MunicipalityModule, CaseWorkerModule, AdminModule],
})
export class AuthModule {}
