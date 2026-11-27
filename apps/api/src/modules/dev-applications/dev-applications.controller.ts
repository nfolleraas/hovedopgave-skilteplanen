import { Body, Controller, Get, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { dtoValidationPipe } from '../../common/dto-validation.pipe.js';
import { DevApplicationsService } from './dev-applications.service.js';
import { CreateDevApplicationDto } from './dto/create-dev-application.dto.js';

/** Test-only endpoints. The module is not loaded in production. */
@ApiTags('dev')
@Controller('dev/applications')
@UsePipes(dtoValidationPipe)
export class DevApplicationsController {
  /**
   * Creates the controller for the test-only application endpoints.
   * @param devApplicationsService - Service that lists and creates applications
   */
  constructor(
    private readonly devApplicationsService: DevApplicationsService,
  ) {}

  /**
   * Lists all applications with their number of areas.
   * @returns A summary of each application
   */
  @Get()
  findAll() {
    return this.devApplicationsService.findAll();
  }

  /**
   * Creates a draft test application.
   * @param dto - The type of application to create
   * @returns A summary of the created application
   */
  @Post()
  create(@Body() dto: CreateDevApplicationDto) {
    return this.devApplicationsService.create(dto.type);
  }
}
