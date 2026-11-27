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
   * Maps actor creation data to normalized fields and application and address
   * relations.
   * @param dto - Actor creation data to normalize
   * @param existingAddressId - Optional UUID of an address to reuse
   * @returns Prisma creation data with application and address relations
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
   * Maps supplied actor updates while preserving omitted fields and excluding
   * the immutable role.
   * @param dto - Supplied actor fields to update
   * @param existingAddressId - Optional UUID of an address to reuse
   * @returns Prisma update data containing only supplied mutable fields
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
