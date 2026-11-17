import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Actor } from '../../generated/prisma/client.js';
import { ActorRole } from '../../generated/prisma/enums.js';
import { AddressService } from '../address/address.service.js';
import { ApplicationsRepository } from '../applications/applications.repository.js';
import { ActorsRepository } from './actors.repository.js';
import { CreateActorDto } from './dto/create-actor.dto.js';
import { UpdateActorDto } from './dto/update-actor.dto.js';
import { ActorMapper } from './mappers/actor.mapper.js';

@Injectable()
export class ActorsService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly actorsRepository: ActorsRepository,
    private readonly actorMapper: ActorMapper,
    private readonly addressService: AddressService,
  ) {}

  /**
   * @summary Create an actor for an existing application,
   * reusing a matching address and applying role-specific business rules.
   */
  async create(
    createActorDto: CreateActorDto,
  ): Promise<Awaited<ReturnType<ActorsRepository['create']>>> {
    const application = await this.applicationsRepository.get(
      createActorDto.applicationCaseNumber,
    );
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const address = await this.addressService.findMatching(
      createActorDto.address,
    );
    const actorData =
      createActorDto.role === ActorRole.Private
        ? { ...createActorDto, cvrNumber: null, department: null }
        : createActorDto;

    return this.actorsRepository.create(
      this.actorMapper.toCreateInput(actorData, address?.uuid),
    );
  }

  /** @summary List actors with their related details. */
  findAll(): ReturnType<ActorsRepository['getAll']> {
    return this.actorsRepository.getAll();
  }

  /** @summary Find an actor or throw a not-found exception. */
  async findOne(
    uuid: string,
  ): Promise<NonNullable<Awaited<ReturnType<ActorsRepository['get']>>>> {
    const actor = await this.actorsRepository.get(uuid);
    if (!actor) {
      throw new NotFoundException('Actor not found');
    }
    return actor;
  }

  /**
   * @summary Update supplied actor fields while rejecting role changes
   * and reporting missing actors as not found.
   */
  async update(
    uuid: string,
    updateActorDto: UpdateActorDto,
  ): Promise<NonNullable<Awaited<ReturnType<ActorsRepository['update']>>>> {
    if ('role' in updateActorDto) {
      throw new BadRequestException(
        'Actor role can only be set during creation',
      );
    }
    const address = updateActorDto.address
      ? await this.addressService.findMatching(updateActorDto.address)
      : undefined;
    const actor = await this.actorsRepository.update(
      uuid,
      this.actorMapper.toUpdateInput(updateActorDto, address?.uuid),
    );
    if (!actor) {
      throw new NotFoundException('Actor not found');
    }
    return actor;
  }

  /** @summary Delete an actor or throw a not-found exception. */
  async delete(uuid: string): Promise<Actor> {
    const actor = await this.actorsRepository.delete(uuid);
    if (!actor) {
      throw new NotFoundException('Actor not found');
    }
    return actor;
  }
}
