import { Controller, Post } from '@nestjs/common';
import { AdminService } from './admin.service.js';

@Controller('auth/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  login(): void {
    this.adminService.login();
  }
}
