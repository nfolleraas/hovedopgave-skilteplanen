import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Actor, Prisma } from '../../generated/prisma/client.js';
import { ActorRole, Availability } from '../../generated/prisma/enums.js';
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
   * Creates an actor for an existing application, reusing a matching address
   * and applying role-specific business rules.
   * @param createActorDto - Actor details and application case number
   * @returns The created actor with its address and contact persons
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

    return this.actorsRepository.withTransaction(async (repository) => {
      await this.rejectDuplicate(
        repository,
        {
          cvrNumber:
            createActorDto.role === ActorRole.Private
              ? null
              : (createActorDto.cvrNumber ?? null),
          email: createActorDto.email,
        },
        { caseNumber: createActorDto.applicationCaseNumber },
      );

      const address = await this.addressService.findMatching(
        createActorDto.address,
      );
      const actorData =
        createActorDto.role === ActorRole.Private
          ? { ...createActorDto, cvrNumber: null, department: null }
          : createActorDto;

      const data = this.actorMapper.toCreateInput(actorData, address?.uuid);
      // PLACEHOLDER: Remove when the contact-person branch adds real creation.
      if (createActorDto.role !== ActorRole.Private) {
        data.contactPersons = {
          create: {
            name: 'PLACEHOLDER kontaktperson',
            email: 'placeholder@example.com',
            phoneNumber: '00000000',
            availability: Availability.AllDay,
            application: {
              connect: { caseNumber: createActorDto.applicationCaseNumber },
            },
          },
        };
      }

      return repository.create(data);
    });
  }

  /**
   * Lists actors with their related details.
   * @param caseNumber - Optional application case number to filter by
   * @returns The matching actors with their related details
   */
  findAll(caseNumber?: string): ReturnType<ActorsRepository['getAll']> {
    return caseNumber
      ? this.actorsRepository.getAll(caseNumber)
      : this.actorsRepository.getAll();
  }

  /**
   * Finds an actor or throws a not-found exception.
   * @param uuid - UUID of the actor to find
   * @returns The actor with its related details
   */
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
   * Updates supplied actor fields while rejecting role changes and reporting
   * missing actors as not found.
   * @param uuid - UUID of the actor to update
   * @param updateActorDto - Actor fields to update
   * @returns The updated actor with its related details
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
    return this.actorsRepository.withTransaction(async (repository) => {
      if (
        updateActorDto.email !== undefined ||
        updateActorDto.cvrNumber !== undefined
      ) {
        const existing = await repository.get(uuid);
        if (!existing) throw new NotFoundException('Actor not found');
        await this.rejectDuplicate(
          repository,
          {
            cvrNumber: updateActorDto.cvrNumber ?? existing.cvrNumber,
            email: updateActorDto.email ?? existing.email,
          },
          { actors: { some: { uuid } } },
          uuid,
        );
      }
      const address = updateActorDto.address
        ? await this.addressService.findMatching(updateActorDto.address)
        : undefined;
      const actor = await repository.update(
        uuid,
        this.actorMapper.toUpdateInput(updateActorDto, address?.uuid),
      );
      if (!actor) {
        throw new NotFoundException('Actor not found');
      }
      return actor;
    });
  }

  private async rejectDuplicate(
    repository: Pick<ActorsRepository, 'findDuplicate'>,
    identity: { cvrNumber: string | null; email: string },
    application: Prisma.ApplicationWhereInput,
    excludeUuid?: string,
  ): Promise<void> {
    const duplicate = await repository.findDuplicate(
      identity,
      application,
      excludeUuid,
    );
    if (duplicate) {
      const field = identity.cvrNumber?.trim() ? 'cvrNumber' : 'email';
      throw new ConflictException({
        field,
        message:
          field === 'cvrNumber'
            ? 'En aktør med dette CVR-nummer findes allerede på ansøgningen.'
            : 'En aktør med denne e-mailadresse findes allerede på ansøgningen.',
      });
    }
  }

  /**
   * Deletes an actor or throws a not-found exception.
   * @param uuid - UUID of the actor to delete
   * @returns The deleted actor
   */
  async delete(uuid: string): Promise<Actor> {
    const actor = await this.actorsRepository.delete(uuid);
    if (!actor) {
      throw new NotFoundException('Actor not found');
    }
    return actor;
  }
}
