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
import { PrismaService } from '../../prisma.service.js';
import { ActorsRepository } from './actors.repository.js';
import { CreateActorDto } from './dto/create-actor.dto.js';
import { UpdateActorDto } from './dto/update-actor.dto.js';
import { ActorMapper } from './mappers/actor.mapper.js';

@Injectable()
export class ActorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actorsRepository: ActorsRepository,
    private readonly actorMapper: ActorMapper,
  ) {}

  async create(createActorDto: CreateActorDto) {
    const application = await this.prisma.application.findUnique({
      where: { caseNumber: createActorDto.applicationCaseNumber },
      select: { type: true },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    let contactAvailability: Availability = Availability.Day;
    if (createActorDto.role !== ActorRole.Private) {
      if (!createActorDto.contactPerson) {
        throw new BadRequestException('Contact person is required');
      }
      const requestedAvailability = createActorDto.contactPerson.availability;
      if (requestedAvailability) {
        contactAvailability = requestedAvailability;
      } else if (application.type === ApplicationType.ExcavationPermit) {
        throw new BadRequestException('Contact availability is required');
      }
    }

    return this.actorsRepository.create(
      this.actorMapper.toCreateInput(createActorDto, contactAvailability),
    );
  }

  getAll() {
    return this.actorsRepository.getAll();
  }

  async get(uuid: string) {
    const actor = await this.actorsRepository.get(uuid);
    if (!actor) {
      throw new NotFoundException('Actor not found');
    }
    return actor;
  }

  findAll() {
    return this.getAll();
  }

  findOne(uuid: string) {
    return this.get(uuid);
  }

  update(id: number, _updateActorDto: UpdateActorDto) {
    return `This action updates a #${id} actor`;
  }

  remove(id: number) {
    return `This action removes a #${id} actor`;
  }
}
