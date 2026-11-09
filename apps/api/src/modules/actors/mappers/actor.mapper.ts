import type { Prisma } from '../../../generated/prisma/client.js';
import {
  ActorRole,
  type Availability,
} from '../../../generated/prisma/enums.js';
import type { CreateActorDto } from '../dto/create-actor.dto.js';

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
              create: {
                name: dto.contactPerson.name.trim(),
                email: dto.contactPerson.email.trim(),
                phoneNumber: dto.contactPerson.phoneNumber,
                availability: contactAvailability,
                application: {
                  connect: { caseNumber: dto.applicationCaseNumber },
                },
              },
            },
          }
        : {}),
      address: {
        create: {
          street: dto.address.street.trim(),
          houseNumber: dto.address.houseNumber.trim(),
          postalCode: dto.address.postalCode.trim(),
          city: dto.address.city.trim(),
        },
      },
    };
  }
}
