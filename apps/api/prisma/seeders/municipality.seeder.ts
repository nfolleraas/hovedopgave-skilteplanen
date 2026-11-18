import type {
  Municipality,
  PrismaClient,
} from '../../src/generated/prisma/client.js';

const demoAddressId = '54f6636e-b097-45b7-9991-c83a59b01805';

/**
 * Creates a demo municipality for manual testing and preserves edits on reruns.
 */
export async function seedMunicipality(
  prisma: PrismaClient,
): Promise<Municipality> {
  return prisma.municipality.upsert({
    where: { addressId: demoAddressId },
    update: {},
    create: {
      name: 'Demokommune',
      region: 'Region Syddanmark',
      email: 'kommune@example.test',
      phoneNumber: '12345678',
      address: {
        connectOrCreate: {
          where: { uuid: demoAddressId },
          create: {
            uuid: demoAddressId,
            street: 'Flakhaven',
            houseNumber: '2',
            postalCode: '5000',
            city: 'Odense C',
          },
        },
      },
    },
  });
}
