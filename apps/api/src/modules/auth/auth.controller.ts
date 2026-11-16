import { Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  me(): void {
    this.authService.me();
  }

  @Post('logout')
  logout(): void {
    this.authService.logout();
  }

  @Post('refresh')
  refresh(): void {
    this.authService.refresh();
  }
}
