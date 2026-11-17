import type { Prisma } from '../../../generated/prisma/client.js';
import { toAddressCreateInput } from '../../address/mappers/address.mapper.js';
import type { CreateActorDto } from '../dto/create-actor.dto.js';

import type { UpdateActorDto } from '../dto/update-actor.dto.js';

type ActorCreationData = Omit<CreateActorDto, 'cvrNumber' | 'department'> & {
  cvrNumber?: string | null;
  department?: string | null;
};

export class ActorMapper {
  /**
   * @summary Map actor creation data to normalized fields
   * and application and address relations.
   */
  toCreateInput(
    dto: ActorCreationData,
    existingAddressId?: string,
  ): Prisma.ActorCreateInput {
    return {
      role: dto.role,
      name: dto.name.trim(),
      phoneNumber: dto.phoneNumber,
      email: dto.email.trim(),
      cvrNumber: dto.cvrNumber,
      department: dto.department?.trim() ?? dto.department,
      applications: {
        connect: { caseNumber: dto.applicationCaseNumber },
      },
      address: existingAddressId
        ? { connect: { uuid: existingAddressId } }
        : { create: toAddressCreateInput(dto.address) },
    };
  }

  /**
   * @summary Map supplied actor updates while preserving omitted fields
   * and excluding the immutable role.
   */
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
