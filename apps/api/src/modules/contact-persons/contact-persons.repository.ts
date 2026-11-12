import { Injectable } from '@nestjs/common';
import {
  Actor,
  Application,
  ContactPerson,
  Prisma,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type ContactPersonWithApplication = ContactPerson & {
  application: Application;
};

export type ContactPersonApplication = Pick<
  Application,
  'caseNumber' | 'type' | 'status'
>;

export type ContactPersonActor = Pick<Actor, 'uuid' | 'name' | 'role'>;

@Injectable()
export class ContactPersonsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(
    contactPerson: Prisma.ContactPersonCreateInput,
  ): Promise<ContactPerson> {
    return await this.prisma.contactPerson.create({ data: contactPerson });
  }

  async getAllByApplication(applicationId: string): Promise<ContactPerson[]> {
    return await this.prisma.contactPerson.findMany({
      where: { applicationId },
      orderBy: { uuid: 'asc' },
    });
  }

  async getById(uuid: string): Promise<ContactPersonWithApplication> {
    return await this.prisma.contactPerson.findUniqueOrThrow({
      where: { uuid },
      include: { application: true },
    });
  }

  async update(
    uuid: string,
    updatedContactPerson: Prisma.ContactPersonUpdateInput,
  ): Promise<ContactPerson> {
    return await this.prisma.contactPerson.update({
      where: { uuid },
      data: updatedContactPerson,
    });
  }

  async delete(uuid: string): Promise<ContactPerson> {
    return await this.prisma.contactPerson.delete({ where: { uuid } });
  }

  async getApplication(caseNumber: string): Promise<ContactPersonApplication> {
    return await this.prisma.application.findUniqueOrThrow({
      where: { caseNumber },
      select: { caseNumber: true, type: true, status: true },
    });
  }

  /** The actors on an application, sorted by name. */
  async getActorsByApplication(
    caseNumber: string,
  ): Promise<ContactPersonActor[]> {
    return await this.prisma.actor.findMany({
      where: { applications: { some: { caseNumber } } },
      select: { uuid: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });
  }

  /** The actor, if it is on the application. */
  async getActorOnApplication(
    actorId: string,
    caseNumber: string,
  ): Promise<ContactPersonActor | null> {
    return await this.prisma.actor.findFirst({
      where: { uuid: actorId, applications: { some: { caseNumber } } },
      select: { uuid: true, name: true, role: true },
    });
  }
}
