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

  @Post()
  async create(@Body() createActorDto: CreateActorDto) {
    const address = await this.addressService.findMatching(
      createActorDto.address,
    );
    return this.actorsService.create(createActorDto, address?.uuid);
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
  async update(
    @Param('uuid') uuid: string,
    @Body() updateActorDto: UpdateActorDto,
  ) {
    const address = updateActorDto.address
      ? await this.addressService.findMatching(updateActorDto.address)
      : undefined;
    return this.actorsService.update(uuid, updateActorDto, address?.uuid);
  }

  @Delete(':uuid')
  delete(@Param('uuid') uuid: string) {
    return this.actorsService.delete(uuid);
  }
}
