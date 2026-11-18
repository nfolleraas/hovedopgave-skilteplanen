import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateMunicipalityDto } from './dto/create-municipality.dto.js';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto.js';
import type { MunicipalityWithAddress } from './municipalities.repository.js';
import { MunicipalitiesService } from './municipalities.service.js';

@Controller('municipalities')
export class MunicipalitiesController {
  /**
   * Connects the HTTP routes to the service that validates and saves
   * municipality details.
   */
  constructor(private readonly municipalitiesService: MunicipalitiesService) {}

  /**
   * Returns the municipality and its address for the ID in the route. Returns
   * HTTP 404 when the municipality cannot be found.
   */
  @Get(':id')
  findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MunicipalityWithAddress> {
    return this.municipalitiesService.findById(id);
  }

  /**
   * Creates a municipality and its address from the request body. The service
   * validates the input before saving.
   */
  @Post()
  create(
    @Body() data: CreateMunicipalityDto,
  ): Promise<MunicipalityWithAddress> {
    return this.municipalitiesService.create(data);
  }

  /**
   * Updates the municipality’s email address, phone number, and address.
   * Returns the saved municipality details.
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateMunicipalityDto,
  ): Promise<MunicipalityWithAddress> {
    return this.municipalitiesService.update(id, data);
  }
}
