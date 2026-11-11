import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ActorsService } from './actors.service.js';
import { CreateActorDto } from './dto/create-actor.dto.js';
import { UpdateActorDto } from './dto/update-actor.dto.js';

@Controller('actors')
export class ActorsController {
  constructor(private readonly actorsService: ActorsService) {}

  @Post()
  create(@Body() createActorDto: CreateActorDto) {
    return this.actorsService.create(createActorDto);
  }

  @Get()
  getAll() {
    return this.actorsService.findAll();
  }

  @Get(':uuid')
  get(@Param('uuid') uuid: string) {
    return this.actorsService.findOne(uuid);
  }

  @Patch(':uuid')
  update(@Param('uuid') uuid: string, @Body() updateActorDto: UpdateActorDto) {
    return this.actorsService.update(uuid, updateActorDto);
  }

  @Delete(':uuid')
  delete(@Param('uuid') uuid: string) {
    return this.actorsService.delete(uuid);
  }
}
