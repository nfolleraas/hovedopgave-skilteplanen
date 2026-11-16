import { Controller, Get } from '@nestjs/common';
import { MunicipalityService } from './municipality.service.js';

@Controller('auth/municipality')
export class MunicipalityController {
  constructor(private readonly municipalityService: MunicipalityService) {}

  @Get('start')
  start(): void {
    this.municipalityService.start();
  }

  @Get('callback')
  callback(): void {
    this.municipalityService.callback();
  }
}
