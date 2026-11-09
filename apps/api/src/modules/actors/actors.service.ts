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
import { CreateActorDto } from './dto/create-actor.dto.js';
import { UpdateActorDto } from './dto/update-actor.dto.js';
import { ActorMapper } from './mappers/actor.mapper.js';

@Injectable()
export class ActorsService {
  constructor(
    private readonly prisma: PrismaService,
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

    return this.prisma.actor.create({
      data: this.actorMapper.toCreateInput(createActorDto, contactAvailability),
      include: { address: true, contactPersons: true },
    });
  }

  async findForApplication(caseNumber: string) {
    const application = await this.prisma.application.findUnique({
      where: { caseNumber },
      select: {
        type: true,
        actors: {
          include: {
            address: true,
            contactPersons: { where: { applicationId: caseNumber } },
          },
        },
      },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
  }

  findAll() {
    return `This action returns all actors`;
  }

  findOne(id: number) {
    return `This action returns a #${id} actor`;
  }

  update(id: number, _updateActorDto: UpdateActorDto) {
    return `This action updates a #${id} actor`;
  }

  remove(id: number) {
    return `This action removes a #${id} actor`;
  }
}
