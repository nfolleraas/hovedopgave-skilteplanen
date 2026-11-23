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
import { MunicipalityService } from './municipality.service.js';

@Controller('auth/municipality')
export class MunicipalityController {
  constructor(
    private readonly municipalityService: MunicipalityService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  @Public()
  @Get('start')
  @Header('Cache-Control', 'no-store')
  @Redirect(undefined, HttpStatus.FOUND)
  async start(
    @Query('returnPath') returnPath?: unknown,
  ): Promise<{ url: string }> {
    return { url: await this.municipalityService.start(returnPath) };
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
    const result = await this.municipalityService.callback({
      state,
      code,
      error,
    });

    setSessionCookies(response, this.config, result.session);

    return { status: result.status, loginType: result.loginType };
  }
}
