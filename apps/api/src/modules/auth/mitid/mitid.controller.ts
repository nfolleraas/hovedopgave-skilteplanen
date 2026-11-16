import { Controller, Get } from '@nestjs/common';
import { MitidService } from './mitid.service.js';

@Controller('auth/mitid')
export class MitidController {
  constructor(private readonly mitidService: MitidService) {}

  @Get('private/start')
  startPrivate(): void {
    this.mitidService.startPrivate();
  }

  @Get('business/start')
  startBusiness(): void {
    this.mitidService.startBusiness();
  }

  @Get('callback')
  callback(): void {
    this.mitidService.callback();
  }
}
