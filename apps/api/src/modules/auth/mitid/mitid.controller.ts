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
  constructor(
    private readonly mitidService: MitidService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  @Public()
  @Get('private/start')
  @Header('Cache-Control', 'no-store')
  @Redirect(undefined, HttpStatus.FOUND)
  async startPrivate(
    @Query('returnPath') returnPath?: unknown,
  ): Promise<{ url: string }> {
    return { url: await this.mitidService.startPrivate(returnPath) };
  }

  @Public()
  @Get('business/start')
  @Header('Cache-Control', 'no-store')
  @Redirect(undefined, HttpStatus.FOUND)
  async startBusiness(
    @Query('returnPath') returnPath?: unknown,
  ): Promise<{ url: string }> {
    return { url: await this.mitidService.startBusiness(returnPath) };
  }

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
