import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AddressService } from '../address/address.service.js';
import { ActorsService } from './actors.service.js';
import { CreateActorDto } from './dto/create-actor.dto.js';
import { UpdateActorDto } from './dto/update-actor.dto.js';

@Controller('actors')
export class ActorsController {
  constructor(
    private readonly actorsService: ActorsService,
    private readonly addressService: AddressService,
  ) {}

  /** @summary Create an actor after looking up a reusable address. */
  @Post()
  async create(@Body() createActorDto: CreateActorDto) {
    const address = await this.addressService.findMatching(
      createActorDto.address,
    );
    return this.actorsService.create(createActorDto, address?.uuid);
  }

  /** @summary Return all actors with their related details. */
  @Get()
  getAll() {
    return this.actorsService.findAll();
  }

  /** @summary Return the actor identified by its UUID. */
  @Get(':uuid')
  get(@Param('uuid') uuid: string) {
    return this.actorsService.findOne(uuid);
  }

  /**
   * @summary Partially update an actor,
   * resolving a reusable address when supplied.
   */
  @Patch(':uuid')
  async update(
    @Param('uuid') uuid: string,
    @Body() updateActorDto: UpdateActorDto,
  ) {
    const address = updateActorDto.address
      ? await this.addressService.findMatching(updateActorDto.address)
      : undefined;
    return this.actorsService.update(uuid, updateActorDto, address?.uuid);
  }

  /** @summary Delete the requested actor and its contact persons. */
  @Delete(':uuid')
  delete(@Param('uuid') uuid: string) {
    return this.actorsService.delete(uuid);
  }
}
