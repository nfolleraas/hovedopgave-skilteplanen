import { Controller, Get } from '@nestjs/common';
import { Public } from '../decorators/public.decorator.js';
import { MitidService } from './mitid.service.js';

@Controller('auth/mitid')
export class MitidController {
  constructor(private readonly mitidService: MitidService) {}

  @Public()
  @Get('private/start')
  startPrivate(): void {
    this.mitidService.startPrivate();
  }

  @Public()
  @Get('business/start')
  startBusiness(): void {
    this.mitidService.startBusiness();
  }

  @Public()
  @Get('callback')
  callback(): void {
    this.mitidService.callback();
  }
}
