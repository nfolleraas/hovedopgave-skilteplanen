import type { Prisma } from '../../../generated/prisma/client.js';
import {
  ActorRole,
  type Availability,
} from '../../../generated/prisma/enums.js';
import type { CreateAddressDto } from '../../address/dto/create-address.dto.js';
import type { CreateContactPersonDto } from '../../contact-person/dto/create-contact-person.dto.js';
import type { CreateActorDto } from '../dto/create-actor.dto.js';

import type { UpdateActorDto } from '../dto/update-actor.dto.js';

export class ActorMapper {
  toCreateInput(
    dto: CreateActorDto,
    contactAvailability: Availability,
  ): Prisma.ActorCreateInput {
    return {
      role: dto.role,
      name: dto.name.trim(),
      phoneNumber: dto.phoneNumber,
      email: dto.email.trim(),
      cvrNumber: dto.role === ActorRole.Private ? null : dto.cvrNumber,
      department:
        dto.role === ActorRole.Private ? null : dto.department?.trim(),
      applications: {
        connect: { caseNumber: dto.applicationCaseNumber },
      },
      ...(dto.role !== ActorRole.Private && dto.contactPerson
        ? {
            contactPersons: {
              create: this.toContactPersonCreateInput(
                dto.contactPerson,
                contactAvailability,
                dto.applicationCaseNumber,
              ),
            },
          }
        : {}),
      address: {
        create: this.toAddressCreateInput(dto.address),
      },
    };
  }

  toUpdateInput(uuid: string, dto: UpdateActorDto): Prisma.ActorUpdateInput {
    return {
      ...(dto.cvrNumber !== undefined ? { cvrNumber: dto.cvrNumber } : {}),
      ...(dto.department !== undefined
        ? { department: dto.department.trim() }
        : {}),
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.phoneNumber !== undefined
        ? { phoneNumber: dto.phoneNumber }
        : {}),
      ...(dto.email !== undefined ? { email: dto.email.trim() } : {}),
      ...(dto.contactPerson !== undefined
        ? {
            contactPersons: {
              update: {
                where: { actorId: uuid },
                data: {
                  ...(dto.contactPerson.name !== undefined
                    ? { name: dto.contactPerson.name.trim() }
                    : {}),
                  ...(dto.contactPerson.email !== undefined
                    ? { email: dto.contactPerson.email.trim() }
                    : {}),
                  ...(dto.contactPerson.phoneNumber !== undefined
                    ? {
                        phoneNumber: dto.contactPerson.phoneNumber,
                      }
                    : {}),
                  ...(dto.contactPerson.availability !== undefined
                    ? {
                        availability: dto.contactPerson.availability,
                      }
                    : {}),
                },
              },
            },
          }
        : {}),
      ...(dto.address
        ? {
            address: {
              update: this.toAddressCreateInput(dto.address),
            },
          }
        : {}),
    };
  }

  private toAddressCreateInput(dto: CreateAddressDto) {
    return {
      street: dto.street.trim(),
      houseNumber: dto.houseNumber.trim(),
      postalCode: dto.postalCode.trim(),
      city: dto.city.trim(),
    };
  }

  private toContactPersonCreateInput(
    dto: CreateContactPersonDto,
    availability: Availability,
    applicationCaseNumber: string,
  ) {
    return {
      name: dto.name.trim(),
      email: dto.email.trim(),
      phoneNumber: dto.phoneNumber,
      availability,
      application: {
        connect: { caseNumber: applicationCaseNumber },
      },
    };
  }
}
