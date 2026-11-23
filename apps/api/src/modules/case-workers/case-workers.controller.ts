import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { CaseWorkerDetails } from './case-workers.repository.js';
import { CaseWorkersService } from './case-workers.service.js';
import { CreateCaseWorkerDto } from './dto/create-case-worker.dto.js';
import { UpdateCaseWorkerDto } from './dto/update-case-worker.dto.js';

@Controller('case-workers')
export class CaseWorkersController {
  /** Connects the caseworker routes to the use-case service. */
  constructor(private readonly service: CaseWorkersService) {}

  /** Lists caseworkers in the configured superuser’s municipality. */
  @Get()
  async findAll(): Promise<CaseWorkerDetails[]> {
    return this.service.findAll(this.resolveActor());
  }

  /** Retrieves one caseworker in the configured superuser’s municipality. */
  @Get(':employeeNumber')
  async findOne(
    @Param('employeeNumber') employeeNumber: string,
  ): Promise<CaseWorkerDetails> {
    return this.service.findOne(this.resolveActor(), employeeNumber);
  }

  /** Creates a caseworker in the configured superuser’s municipality. */
  @Post()
  async create(@Body() data: CreateCaseWorkerDto): Promise<CaseWorkerDetails> {
    return this.service.create(this.resolveActor(), data);
  }

  /** Updates another caseworker by their immutable employee number. */
  @Patch(':employeeNumber')
  async update(
    @Param('employeeNumber') employeeNumber: string,
    @Body() data: UpdateCaseWorkerDto,
  ): Promise<CaseWorkerDetails> {
    return this.service.update(this.resolveActor(), employeeNumber, data);
  }

  /** Deletes the selected caseworker and releases their assigned cases. */
  @Delete(':employeeNumber')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('employeeNumber') employeeNumber: string): Promise<void> {
    await this.service.delete(this.resolveActor(), employeeNumber);
  }

  /** Resolves a server-configured actor only in development and tests. */
  private resolveActor(): string {
    const environment = process.env.NODE_ENV;
    const employeeNumber = process.env.CASE_WORKER_DEMO_EMPLOYEE_NUMBER?.trim();

    if (
      (environment !== 'development' && environment !== 'test') ||
      !employeeNumber
    ) {
      throw new ServiceUnavailableException(
        'Caseworker actor is not configured',
      );
    }

    return employeeNumber;
  }
}
