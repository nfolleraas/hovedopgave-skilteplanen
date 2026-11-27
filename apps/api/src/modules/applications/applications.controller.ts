import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationDto } from './dto/update-application.dto.js';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  create(@Body() createApplicationDto: CreateApplicationDto): string {
    return this.applicationsService.create(createApplicationDto);
  }

  @Get()
  findAll(): string {
    return this.applicationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): string {
    return this.applicationsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateApplicationDto: UpdateApplicationDto,
  ): string {
    return this.applicationsService.update(+id, updateApplicationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): string {
    return this.applicationsService.remove(+id);
  }
}
