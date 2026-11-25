import { ActorRole, Availability } from '../../src/generated/prisma/enums.js';
import type { PrismaService } from '../../src/modules/prisma/prisma.service.js';

/** Adds an actor with one contact person, which submission requires. */
export async function addContactPerson(
  prisma: PrismaService,
  caseNumber: string,
) {
  const actor = await prisma.actor.create({
    data: {
      name: 'Test contractor',
      role: ActorRole.Contractor,
      phoneNumber: '11111111',
      email: 'contractor@example.com',
      address: {
        create: {
          street: 'Testvej',
          houseNumber: '1',
          postalCode: '5000',
          city: 'Odense C',
        },
      },
      applications: { connect: { caseNumber } },
    },
  });
  await prisma.contactPerson.create({
    data: {
      name: 'Site contact',
      phoneNumber: '12345678',
      email: 'site@example.com',
      availability: Availability.AllDay,
      applicationId: caseNumber,
      actorId: actor.uuid,
    },
  });
}
