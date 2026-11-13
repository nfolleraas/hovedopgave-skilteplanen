import { Controller, Get } from '@nestjs/common';
import { MunicipalityService } from './municipality.service.js';

@Controller('municipalities')
export class MunicipalityController {
  constructor(private readonly municipalities: MunicipalityService) {}

  /** Returns the municipality choices for the application form. */
  @Get()
  findAll() {
    return this.municipalities.findAll();
  }
}
