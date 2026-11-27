import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { Actor } from '../../generated/prisma/client.js';
import { ActorsService } from './actors.service.js';
import { CreateActorDto } from './dto/create-actor.dto.js';
import { UpdateActorDto } from './dto/update-actor.dto.js';

@Controller('actors')
export class ActorsController {
  constructor(private readonly actorsService: ActorsService) {}

  /**
   * Creates an actor from the request body.
   * @param createActorDto - Validated actor details from the request body
   * @returns The created actor with its related details
   */
  @Post()
  create(
    @Body() createActorDto: CreateActorDto,
  ): ReturnType<ActorsService['create']> {
    return this.actorsService.create(createActorDto);
  }

  /**
   * Returns all actors with their related details.
   * @param caseNumber - Optional application case number from the query
   * @returns The matching actors with their related details
   */
  @Get()
  getAll(
    @Query('caseNumber') caseNumber?: string,
  ): ReturnType<ActorsService['findAll']> {
    return caseNumber
      ? this.actorsService.findAll(caseNumber)
      : this.actorsService.findAll();
  }

  /**
   * Returns the actor identified by its UUID.
   * @param uuid - Validated UUID of the actor to find
   * @returns The actor with its related details
   */
  @Get(':uuid')
  get(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): ReturnType<ActorsService['findOne']> {
    return this.actorsService.findOne(uuid);
  }

  /**
   * Partially update an actor from the request body.
   * @param uuid - Validated UUID of the actor to update
   * @param updateActorDto - Validated actor fields from the request body
   * @returns The updated actor with its related details
   */
  @Patch(':uuid')
  update(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() updateActorDto: UpdateActorDto,
  ): ReturnType<ActorsService['update']> {
    return this.actorsService.update(uuid, updateActorDto);
  }

  /**
   * Deletes the requested actor and its contact persons.
   * @param uuid - Validated UUID of the actor to delete
   * @returns The deleted actor
   */
  @Delete(':uuid')
  delete(@Param('uuid', ParseUUIDPipe) uuid: string): Promise<Actor> {
    return this.actorsService.delete(uuid);
  }
}
