import type { Prisma } from '../../../generated/prisma/client.js';
import { ActorRole } from '../../../generated/prisma/enums.js';
import { toAddressCreateInput } from '../../address/mappers/address.mapper.js';
import type { CreateActorDto } from '../dto/create-actor.dto.js';

import type { UpdateActorDto } from '../dto/update-actor.dto.js';

export class ActorMapper {
  toCreateInput(
    dto: CreateActorDto,
    existingAddressId?: string,
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
      address: existingAddressId
        ? { connect: { uuid: existingAddressId } }
        : { create: toAddressCreateInput(dto.address) },
    };
  }

  toUpdateInput(
    dto: UpdateActorDto,
    existingAddressId?: string,
  ): Prisma.ActorUpdateInput {
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
      ...(dto.address
        ? {
            address: existingAddressId
              ? { connect: { uuid: existingAddressId } }
              : { create: toAddressCreateInput(dto.address) },
          }
        : {}),
    };
  }
}
