import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMunicipalityDto } from './dto/create-municipality.dto.js';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto.js';

export type MunicipalityWithAddress = Prisma.MunicipalityGetPayload<{
  include: { address: true };
}>;

type ChangedMunicipalityField = 'email' | 'phoneNumber' | 'address';

interface MunicipalityUpdateResult {
  municipality: MunicipalityWithAddress;
  changedFields: ChangedMunicipalityField[];
}

@Injectable()
export class MunicipalitiesRepository {
  /**
   * Uses the shared Prisma service that manages the database connection.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Looks up a municipality and includes its address.
   *
   * @returns The municipality, or null when the ID does not exist.
   */
  findById(id: number): Promise<MunicipalityWithAddress | null> {
    return this.prisma.municipality.findUnique({
      where: { id },
      include: { address: true },
    });
  }

  /**
   * Creates the municipality and a new address in one database operation.
   * Returns the municipality with its associated address.
   */
  create(data: CreateMunicipalityDto): Promise<MunicipalityWithAddress> {
    return this.prisma.municipality.create({
      data: {
        name: data.name,
        region: data.region,
        email: data.email,
        phoneNumber: data.phoneNumber,
        address: {
          create: {
            street: data.address.street,
            houseNumber: data.address.houseNumber,
            postalCode: data.address.postalCode,
            city: data.address.city,
          },
        },
      },
      include: { address: true },
    });
  }

  /**
   * Compares and saves the editable fields in the same transaction so the
   * returned field names describe the saved update.
   */
  update(
    id: number,
    data: UpdateMunicipalityDto,
  ): Promise<MunicipalityUpdateResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const current = await tx.municipality.findUnique({
          where: { id },
          include: { address: true },
        });
        if (!current) {
          throw new NotFoundException('Kommunen blev ikke fundet');
        }

        const emailChanged = current.email !== data.email;
        const phoneChanged = current.phoneNumber !== data.phoneNumber;
        const addressChanged =
          current.address.street !== data.address.street ||
          current.address.houseNumber !== data.address.houseNumber ||
          current.address.postalCode !== data.address.postalCode ||
          current.address.city !== data.address.city;

        const changedFields: ChangedMunicipalityField[] = [];
        if (emailChanged) changedFields.push('email');
        if (phoneChanged) changedFields.push('phoneNumber');
        if (addressChanged) changedFields.push('address');
        if (changedFields.length === 0) {
          return { municipality: current, changedFields };
        }

        if (emailChanged || phoneChanged) {
          const duplicate = await tx.municipality.findFirst({
            where: {
              id: { not: id },
              OR: [
                ...(emailChanged
                  ? [
                      {
                        email: {
                          equals: data.email,
                          mode: 'insensitive' as const,
                        },
                      },
                    ]
                  : []),
                ...(phoneChanged ? [{ phoneNumber: data.phoneNumber }] : []),
              ],
            },
            select: { email: true, phoneNumber: true },
          });
          if (duplicate) {
            const emailInUse =
              emailChanged &&
              duplicate.email.toLowerCase() === data.email.toLowerCase();
            throw new ConflictException({
              code: emailInUse ? 'emailInUse' : 'phoneNumberInUse',
              message: emailInUse
                ? 'E-mailadressen bruges allerede af en anden kommune'
                : 'Telefonnummeret bruges allerede af en anden kommune',
            });
          }
        }

        const municipality = await tx.municipality.update({
          where: { id },
          data: {
            email: emailChanged ? data.email : undefined,
            phoneNumber: phoneChanged ? data.phoneNumber : undefined,
            address: addressChanged
              ? {
                  update: {
                    street: data.address.street,
                    houseNumber: data.address.houseNumber,
                    postalCode: data.address.postalCode,
                    city: data.address.city,
                  },
                }
              : undefined,
          },
          include: { address: true },
        });
        return { municipality, changedFields };
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
