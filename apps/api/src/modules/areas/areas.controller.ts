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
} from '@nestjs/common';
import { AreasService } from './areas.service.js';
import { CreateAreaDto } from './dto/create-area.dto.js';
import { CreateAreasDto } from './dto/create-areas.dto.js';
import { UpdateAreaDto } from './dto/update-area.dto.js';

@Controller('areas')
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  create(@Body() createAreaDto: CreateAreaDto) {
    return this.areasService.create(createAreaDto);
  }

  @Post('bulk')
  createMany(@Body() createAreasDto: CreateAreasDto) {
    return this.areasService.createMany(createAreasDto);
  }

  @Get()
  findByApplication(@Query('applicationId') applicationId: string) {
    return this.areasService.findByApplication(applicationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.areasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAreaDto: UpdateAreaDto) {
    return this.areasService.update(id, updateAreaDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.areasService.remove(id);
  }
}
