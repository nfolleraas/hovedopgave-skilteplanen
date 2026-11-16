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
import { MunicipalitiesService } from './municipalities.service.js';

@Controller('municipalities')
export class MunicipalitiesController {
  constructor(private readonly municipalitiesService: MunicipalitiesService) {}

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.municipalitiesService.findById(id);
  }

  @Post()
  create(@Body() data: CreateMunicipalityDto) {
    return this.municipalitiesService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateMunicipalityDto,
  ) {
    return this.municipalitiesService.update(id, data);
  }
}
