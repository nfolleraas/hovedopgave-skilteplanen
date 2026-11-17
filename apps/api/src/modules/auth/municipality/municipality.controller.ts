import { Controller, Get } from '@nestjs/common';
import { Public } from '../decorators/public.decorator.js';
import { MunicipalityService } from './municipality.service.js';

@Controller('auth/municipality')
export class MunicipalityController {
  constructor(private readonly municipalityService: MunicipalityService) {}

  @Public()
  @Get('start')
  start(): void {
    this.municipalityService.start();
  }

  @Public()
  @Get('callback')
  callback(): void {
    this.municipalityService.callback();
  }
}
