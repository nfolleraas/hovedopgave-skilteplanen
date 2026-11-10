import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ActorsService } from './actors.service.js';
import { CreateActorDto } from './dto/create-actor.dto.js';

@Controller('actors')
export class ActorsController {
  constructor(private readonly actorsService: ActorsService) {}

  @Post()
  create(@Body() createActorDto: CreateActorDto) {
    return this.actorsService.create(createActorDto);
  }

  @Get()
  getAll() {
    return this.actorsService.getAll();
  }

  @Get(':uuid')
  get(@Param('uuid') uuid: string) {
    return this.actorsService.get(uuid);
  }
}
