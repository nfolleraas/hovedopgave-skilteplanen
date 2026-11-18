import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AUTH_CONFIG, type AuthConfig } from '../../../config/auth.config.js';
import { setSessionCookies } from '../auth-cookie.utils.js';
import { Public } from '../decorators/public.decorator.js';
import { AdminService } from './admin.service.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';

@Controller('auth/admin')
export class AdminController {
  /**
   * Creates the local administrator authentication controller.
   * @param adminService - The service that validates credentials and creates sessions.
   * @param config - The validated authentication and cookie configuration.
   */
  constructor(
    private readonly adminService: AdminService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  /**
   * Authenticates an administrator and writes the resulting session cookies.
   * @param body - The untrusted administrator credential request body.
   * @param request - The incoming HTTP request used to identify the source.
   * @param response - The HTTP response receiving session cookies.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.NO_CONTENT)
  async login(
    @Body() body: AdminLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const tokens = await this.adminService.login({
      email: body.email,
      password: body.password,
      ipAddress: request.ip ?? request.socket.remoteAddress,
    });

    setSessionCookies(response, this.config, tokens);
  }
}
