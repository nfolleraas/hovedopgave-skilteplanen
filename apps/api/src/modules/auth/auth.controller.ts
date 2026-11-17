import { Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AllowAnyAuthenticated } from './decorators/allow-any-authenticated.decorator.js';
import { Public } from './decorators/public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @AllowAnyAuthenticated()
  @Get('me')
  me(): void {
    this.authService.me();
  }

  @AllowAnyAuthenticated()
  @Post('logout')
  logout(): void {
    this.authService.logout();
  }

  @Public()
  @Post('refresh')
  refresh(): void {
    this.authService.refresh();
  }
}
