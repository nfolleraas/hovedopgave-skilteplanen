import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  findAll() {
    return this.actorsRepository.getAll();
  }

  async findOne(uuid: string) {
    const actor = await this.actorsRepository.get(uuid);
    if (!actor) {
      throw new NotFoundException('Actor not found');
    }
    return actor;
  }

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
    return this.actorsRepository.update(
      uuid,
      this.actorMapper.toUpdateInput(updateActorDto, existingAddressId),
    );
  }

  async delete(uuid: string) {
    const actor = await this.actorsRepository.delete(uuid);
    if (!actor) {
      throw new NotFoundException('Actor not found');
    }
    return actor;
  }
}
