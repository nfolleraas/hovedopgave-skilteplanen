import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
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
  ) {}

  /**
   * @summary Create an actor for an existing application,
   * reusing a resolved address when available.
   */
  async create(createActorDto: CreateActorDto, existingAddressId?: string) {
    const application = await this.applicationsRepository.get(
      createActorDto.applicationCaseNumber,
    );
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return this.actorsRepository.create(
      this.actorMapper.toCreateInput(createActorDto, existingAddressId),
    );
  }

  /** @summary List actors with their related details. */
  findAll() {
    return this.actorsRepository.getAll();
  }

  /** @summary Find an actor or throw a not-found exception. */
  async findOne(uuid: string) {
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
    existingAddressId?: string,
  ) {
    if ('role' in updateActorDto) {
      throw new BadRequestException(
        'Actor role can only be set during creation',
      );
    }
    try {
      return await this.actorsRepository.update(
        uuid,
        this.actorMapper.toUpdateInput(updateActorDto, existingAddressId),
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        // A missing related address can also cause P2025; verify the actor
        // before translating the failure to an actor-not-found response.
        await this.findOne(uuid);
      }
      throw error;
    }
  }

  /** @summary Delete an actor or throw a not-found exception. */
  async delete(uuid: string) {
    const actor = await this.actorsRepository.delete(uuid);
    if (!actor) {
      throw new NotFoundException('Actor not found');
    }
    return actor;
  }
}
