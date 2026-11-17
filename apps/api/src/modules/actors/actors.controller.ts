import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type { Actor } from '../../generated/prisma/client.js';
import { ActorsService } from './actors.service.js';
import { CreateActorDto } from './dto/create-actor.dto.js';
import { UpdateActorDto } from './dto/update-actor.dto.js';

@Controller('actors')
export class ActorsController {
  constructor(private readonly actorsService: ActorsService) {}

  /** @summary Create an actor from the request body. */
  @Post()
  create(
    @Body() createActorDto: CreateActorDto,
  ): ReturnType<ActorsService['create']> {
    return this.actorsService.create(createActorDto);
  }

  /** @summary Return all actors with their related details. */
  @Get()
  getAll(): ReturnType<ActorsService['findAll']> {
    return this.actorsService.findAll();
  }

  /** @summary Return the actor identified by its UUID. */
  @Get(':uuid')
  get(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): ReturnType<ActorsService['findOne']> {
    return this.actorsService.findOne(uuid);
  }

  /** @summary Partially update an actor from the request body. */
  @Patch(':uuid')
  update(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() updateActorDto: UpdateActorDto,
  ): ReturnType<ActorsService['update']> {
    return this.actorsService.update(uuid, updateActorDto);
  }

  /** @summary Delete the requested actor and its contact persons. */
  @Delete(':uuid')
  delete(@Param('uuid', ParseUUIDPipe) uuid: string): Promise<Actor> {
    return this.actorsService.delete(uuid);
  }
}
