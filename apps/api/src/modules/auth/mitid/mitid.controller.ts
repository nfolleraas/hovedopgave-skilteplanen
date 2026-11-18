import {
  Controller,
  Get,
  Header,
  HttpStatus,
  Inject,
  Query,
  Redirect,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AUTH_CONFIG, type AuthConfig } from '../../../config/auth.config.js';
import { setSessionCookies } from '../auth-cookie.utils.js';
import { Public } from '../decorators/public.decorator.js';
import { MitidService } from './mitid.service.js';

@Controller('auth/mitid')
export class MitidController {
  /**
   * Creates the MitID authentication controller.
   * @param mitidService - The service that orchestrates Signicat authentication.
   * @param config - The validated authentication and cookie configuration.
   */
  constructor(
    private readonly mitidService: MitidService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  /**
   * Starts a private-person MitID flow and redirects to Signicat.
   * @param returnPath - An optional untrusted local return path query value.
   * @returns The server-created Signicat authorization URL.
   */
  @Public()
  @Get('private/start')
  @Header('Cache-Control', 'no-store')
  @Redirect(undefined, HttpStatus.FOUND)
  async startPrivate(
    @Query('returnPath') returnPath?: unknown,
  ): Promise<{ url: string }> {
    return { url: await this.mitidService.startPrivate(returnPath) };
  }

  /**
   * Starts a MitID Business flow and redirects to Signicat.
   * @param returnPath - An optional untrusted local return path query value.
   * @returns The server-created Signicat authorization URL.
   */
  @Public()
  @Get('business/start')
  @Header('Cache-Control', 'no-store')
  @Redirect(undefined, HttpStatus.FOUND)
  async startBusiness(
    @Query('returnPath') returnPath?: unknown,
  ): Promise<{ url: string }> {
    return { url: await this.mitidService.startBusiness(returnPath) };
  }

  /**
   * Completes a Signicat callback and writes session cookies for a resolved applicant.
   * @param response - The response receiving access and refresh cookies when issued.
   * @param state - The untrusted OIDC state query value.
   * @param code - The untrusted authorization code query value.
   * @param error - The optional provider error query value.
   * @returns The authentication status and selected login context without provider claims.
   */
  @Public()
  @Get('callback')
  @Header('Cache-Control', 'no-store')
  async callback(
    @Res({ passthrough: true }) response: Response,
    @Query('state') state?: unknown,
    @Query('code') code?: unknown,
    @Query('error') error?: unknown,
  ): Promise<{ status: string; loginType: string }> {
    const result = await this.mitidService.callback({ state, code, error });

    if (result.session) {
      setSessionCookies(response, this.config, result.session);
    }

    return { status: result.status, loginType: result.loginType };
  }
}
