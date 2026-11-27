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
  Query,
  UsePipes,
} from '@nestjs/common';
import { dtoValidationPipe } from '../../common/dto-validation.pipe.js';
import { AreasService } from './areas.service.js';
import { CreateAreaDto } from './dto/create-area.dto.js';
import { CreateAreasDto } from './dto/create-areas.dto.js';
import { FindAreasQueryDto } from './dto/find-areas-query.dto.js';
import { UpdateAreaDto } from './dto/update-area.dto.js';

@Controller('areas')
@UsePipes(dtoValidationPipe)
export class AreasController {
  /**
   * Creates the controller for area endpoints.
   * @param areasService - Service that handles area business rules
   */
  constructor(private readonly areasService: AreasService) {}

  /**
   * Creates one area for an application.
   * @param createAreaDto - The application ID and the area fields
   * @returns The created area
   */
  @Post()
  create(@Body() createAreaDto: CreateAreaDto) {
    return this.areasService.create(createAreaDto);
  }

  /**
   * Creates several areas for an application in one request.
   * @param createAreasDto - The application ID and the areas to create
   * @returns The created areas
   */
  @Post('bulk')
  createMany(@Body() createAreasDto: CreateAreasDto) {
    return this.areasService.createMany(createAreasDto);
  }

  /**
   * Finds an application and all of its areas.
   * @param query - Query with the ID of the application
   * @returns The application and its areas
   */
  @Get()
  findByApplication(@Query() query: FindAreasQueryDto) {
    return this.areasService.findByApplication(query.applicationId);
  }

  /**
   * Finds one area.
   * @param id - The ID of the area
   * @returns The area
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.areasService.findOne(id);
  }

  /**
   * Updates an area and its details.
   * @param id - The ID of the area
   * @param updateAreaDto - The fields to change
   * @returns The updated area
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAreaDto: UpdateAreaDto) {
    return this.areasService.update(id, updateAreaDto);
  }

  /**
   * Deletes an area. Responds with 204 No Content.
   * @param id - The ID of the area
   * @returns A promise that resolves when the area is deleted
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.areasService.remove(id);
  }
}
