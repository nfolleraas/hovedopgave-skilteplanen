import { Controller, Post } from '@nestjs/common';
import { Public } from '../decorators/public.decorator.js';
import { AdminService } from './admin.service.js';

@Controller('auth/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Public()
  @Post('login')
  login(): void {
    this.adminService.login();
  }
}
