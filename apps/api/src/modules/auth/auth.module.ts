import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminModule } from './admin/admin.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { MitidModule } from './mitid/mitid.module.js';
import { MunicipalityModule } from './municipality/municipality.module.js';
import { SessionModule } from './session.module.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  imports: [SessionModule, MitidModule, MunicipalityModule, AdminModule],
})
export class AuthModule {}
