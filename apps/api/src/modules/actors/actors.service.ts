import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActorRole,
  ApplicationType,
  Availability,
} from '../../generated/prisma/enums.js';
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

  async create(createActorDto: CreateActorDto) {
    const application = await this.applicationsRepository.get(
      createActorDto.applicationCaseNumber,
    );
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    let contactAvailability: Availability = Availability.Day;
    if (createActorDto.role === ActorRole.Private) {
      if (createActorDto.contactPerson) {
        throw new BadRequestException(
          'Private actors cannot have contact persons',
        );
      }
    } else if (createActorDto.contactPerson) {
      if (application.type === ApplicationType.ExcavationPermit) {
        const requestedAvailability = createActorDto.contactPerson.availability;
        if (!requestedAvailability) {
          throw new BadRequestException('Contact availability is required');
        }
        contactAvailability = requestedAvailability;
      }
    }

    return this.actorsRepository.create(
      this.actorMapper.toCreateInput(createActorDto, contactAvailability),
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

  async update(uuid: string, updateActorDto: UpdateActorDto) {
    if ('role' in updateActorDto) {
      throw new BadRequestException(
        'Actor role can only be set during creation',
      );
    }
    let dto = updateActorDto;
    if (dto.contactPerson !== undefined) {
      const actor = await this.findOne(uuid);
      if (actor.role === ActorRole.Private) {
        throw new BadRequestException(
          'Private actors cannot have contact persons',
        );
      }

      const contactPerson = actor.contactPersons[0];
      if (!contactPerson) {
        throw new NotFoundException('Contact person not found');
      }
      const application = await this.applicationsRepository.get(
        contactPerson.applicationId,
      );
      if (!application) {
        throw new NotFoundException('Application not found');
      }
      if (application.type !== ApplicationType.ExcavationPermit) {
        dto = {
          ...dto,
          contactPerson: {
            ...dto.contactPerson,
            availability: Availability.Day,
          },
        };
      }
    }

    return this.actorsRepository.update(
      uuid,
      this.actorMapper.toUpdateInput(uuid, dto),
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
