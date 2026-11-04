import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DevApplicationsService } from './dev-applications.service.js';
import { CreateDevApplicationDto } from './dto/create-dev-application.dto.js';

/** Test-only endpoints. The module is not loaded in production. */
@ApiTags('dev')
@Controller('dev/applications')
export class DevApplicationsController {
  constructor(
    private readonly devApplicationsService: DevApplicationsService,
  ) {}

  @Get()
  findAll() {
    return this.devApplicationsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateDevApplicationDto) {
    return this.devApplicationsService.create(dto.type);
  }
}
