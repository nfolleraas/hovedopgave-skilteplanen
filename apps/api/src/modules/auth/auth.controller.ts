import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { AUTH_CONFIG, type AuthConfig } from '../../config/auth.config.js';
import { AuthService } from './auth.service.js';
import type { CurrentAuthSession } from './auth.types.js';
import { readCookie, setSessionCookies } from './auth-cookie.utils.js';
import type { AuthenticatedRequest } from './auth-request.types.js';
import { AllowAnyAuthenticated } from './decorators/allow-any-authenticated.decorator.js';
import { Public } from './decorators/public.decorator.js';
import type { JwtClaims } from './jwt/jwt.types.js';

@Controller('auth')
export class AuthController {
  /**
   * Creates the authentication HTTP controller.
   * @param authService - The authentication application service.
   * @param config - The validated authentication and cookie configuration.
   */
  constructor(
    private readonly authService: AuthService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  @AllowAnyAuthenticated()
  @Get('me')
  me(@Req() request: AuthenticatedRequest): CurrentAuthSession {
    return this.authService.me(this.requireClaims(request));
  }

  @AllowAnyAuthenticated()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = readCookie(
      request.headers.cookie,
      this.config.cookies.refreshName,
    );

    await this.authService.logout(refreshToken);
    this.clearAuthCookies(response);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const claims = this.requireClaims(request);

    await this.authService.logoutAll({
      subject: claims.subject,
      actor: claims.actor,
    });
    this.clearAuthCookies(response);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  async refresh(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = readCookie(
      request.headers.cookie,
      this.config.cookies.refreshName,
    );
    const tokens = await this.authService.refresh(refreshToken);

    setSessionCookies(response, this.config, tokens);
  }

  /**
   * Requires the claims attached by the global authentication guard.
   * @param request - The authenticated HTTP request.
   * @returns The validated JWT claims.
   */
  private requireClaims(request: AuthenticatedRequest): JwtClaims {
    if (!request.auth) {
      throw new UnauthorizedException('Authentication required.');
    }

    return request.auth;
  }

  /**
   * Clears the access and refresh cookies using their configured paths.
   * @param response - The Express response clearing the cookies.
   */
  private clearAuthCookies(response: Response): void {
    response.clearCookie(
      this.config.cookies.accessName,
      this.cookieOptions(this.config.cookies.accessPath),
    );
    response.clearCookie(
      this.config.cookies.refreshName,
      this.cookieOptions(this.config.cookies.refreshPath),
    );
  }

  /**
   * Creates the shared security options for an authentication cookie.
   * @param path - The request path scope for the cookie.
   * @returns Secure cookie options for Express.
   */
  private cookieOptions(path: string): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.cookies.secure,
      sameSite: this.config.cookies.sameSite,
      path,
    };
  }
}
