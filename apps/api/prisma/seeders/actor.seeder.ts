import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { ActorRole } from '../../src/generated/prisma/client.js';
import { demoCaseNumber } from './application.seeder.js';

// Actor and Address have no natural unique key, so the seed uses fixed
// UUIDs. That keeps `upsert` idempotent: running the seed again updates the
// same rows instead of creating duplicates.
const demoActorAddress = {
  uuid: '5eed0000-0000-4000-8000-000000000001',
  street: 'Demovej',
  houseNumber: '10',
  postalCode: '5000',
  city: 'Odense C',
};

const demoActors = [
  {
    uuid: '5eed0000-0000-4000-8000-000000000101',
    name: 'Demo Entreprise ApS',
    role: ActorRole.Contractor,
    phoneNumber: '33333333',
    email: 'kontakt@demo-entreprise.example',
    cvrNumber: '33333333',
    department: 'Anlæg',
  },
  {
    uuid: '5eed0000-0000-4000-8000-000000000102',
    name: 'Demo Ledningsejer A/S',
    role: ActorRole.NetworkOperator,
    phoneNumber: '44444444',
    email: 'kontakt@demo-ledningsejer.example',
    cvrNumber: '44444444',
    department: 'Fiber',
  },
  {
    uuid: '5eed0000-0000-4000-8000-000000000103',
    name: 'Demo Projektstyring A/S',
    role: ActorRole.ProjectCoordinator,
    phoneNumber: '55555555',
    email: 'kontakt@demo-projektstyring.example',
    cvrNumber: '55555555',
    department: null,
  },
];

/**
 * Seeds demo actors (UC-040), so contact persons (UC-031) can be tested: a
 * contact person must belong to an actor on the application.
 *
 * The actors are linked to the demo application and to every test
 * application (`DEV-…`, created from the test list) that has no actors yet.
 * Run `seedApplication` first, so the demo application exists.
 */
export async function seedActors(prisma: PrismaClient) {
  const address = await prisma.address.upsert({
    where: { uuid: demoActorAddress.uuid },
    update: {},
    create: demoActorAddress,
  });

  const testApplications = await prisma.application.findMany({
    where: { caseNumber: { startsWith: 'DEV-' }, actors: { none: {} } },
    select: { caseNumber: true },
  });
  const applications = [{ caseNumber: demoCaseNumber }, ...testApplications];

  const actors = [];
  for (const { uuid, ...fields } of demoActors) {
    actors.push(
      await prisma.actor.upsert({
        where: { uuid },
        // `connect` leaves existing links alone, so this is safe to repeat.
        update: { applications: { connect: applications } },
        create: {
          uuid,
          ...fields,
          address: { connect: { uuid: address.uuid } },
          applications: { connect: applications },
        },
      }),
    );
  }

  return {
    actors,
    applicationIds: applications.map((application) => application.caseNumber),
  };
}
