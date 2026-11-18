import { Module } from '@nestjs/common';
import { PasswordService } from '../password/password.service.js';
import { SessionModule } from '../session.module.js';
import { AdminController } from './admin.controller.js';
import { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';
import { AdminLoginRateLimiter } from './admin-login-rate-limiter.service.js';

@Module({
  imports: [SessionModule],
  controllers: [AdminController],
  providers: [
    AdminLoginRateLimiter,
    AdminRepository,
    AdminService,
    PasswordService,
  ],
})
export class AdminModule {}
