import {
  Controller,
  Get,
  Header,
  HttpStatus,
  Query,
  Redirect,
} from '@nestjs/common';
import { Public } from '../decorators/public.decorator.js';
import { MitidService } from './mitid.service.js';

@Controller('auth/mitid')
export class MitidController {
  constructor(private readonly mitidService: MitidService) {}

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
    @Query('state') state?: unknown,
    @Query('code') code?: unknown,
    @Query('error') error?: unknown,
  ): Promise<{ status: 'authenticated'; loginType: string }> {
    const result = await this.mitidService.callback({ state, code, error });

    return { status: 'authenticated', loginType: result.loginType };
  }
}
