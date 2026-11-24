import type { PrismaClient } from '../../src/generated/prisma/client.js';

export const demoMunicipalityId = 990_001;
export const demoMunicipalityClaim = 'demo-kommune';
export const demoKeycloakIssuer =
  'http://localhost:8080/realms/demo-municipality';
export const demoAnnaEmployeeNumber = 'DEMO-ANNA-001';
export const demoAnnaKeycloakSubject = '11111111-1111-4111-8111-111111111111';

const demoMunicipalityAddressId = '33333333-3333-4333-8333-333333333333';
const keycloakOnlyPasswordHash = 'KEYCLOAK_AUTHENTICATION_ONLY';

/**
 * Seeds the application-side identity records required for Anna's fictional
 * Keycloak case-worker login.
 * @param prisma - The shared Prisma client owned by the seed entry point.
 * @returns The seeded municipality, case worker, provider, and identity link.
 */
export async function seedMunicipalityAuthentication(prisma: PrismaClient) {
  const address = await prisma.address.upsert({
    where: { uuid: demoMunicipalityAddressId },
    update: {
      street: 'Demovej',
      houseNumber: '1',
      postalCode: '5000',
      city: 'Odense C',
    },
    create: {
      uuid: demoMunicipalityAddressId,
      street: 'Demovej',
      houseNumber: '1',
      postalCode: '5000',
      city: 'Odense C',
    },
  });

  const municipality = await prisma.municipality.upsert({
    where: { id: demoMunicipalityId },
    update: {
      name: 'Demo Kommune',
      region: 'Region Syddanmark',
      email: 'kommune@example.test',
      phoneNumber: '70112233',
      addressId: address.uuid,
    },
    create: {
      id: demoMunicipalityId,
      name: 'Demo Kommune',
      region: 'Region Syddanmark',
      email: 'kommune@example.test',
      phoneNumber: '70112233',
      addressId: address.uuid,
    },
  });

  const caseWorker = await prisma.caseWorker.upsert({
    where: { employeeNumber: demoAnnaEmployeeNumber },
    update: {
      name: 'Anna Jensen',
      email: 'anna@example.test',
      phoneNumber: '20112233',
      isSuperUser: false,
      municipalityId: municipality.id,
    },
    create: {
      employeeNumber: demoAnnaEmployeeNumber,
      name: 'Anna Jensen',
      email: 'anna@example.test',
      passwordHash: keycloakOnlyPasswordHash,
      phoneNumber: '20112233',
      isSuperUser: false,
      municipalityId: municipality.id,
    },
  });

  const provider = await prisma.municipalityAuthProvider.upsert({
    where: {
      provider_issuer_municipalityClaim: {
        provider: 'KEYCLOAK',
        issuer: demoKeycloakIssuer,
        municipalityClaim: demoMunicipalityClaim,
      },
    },
    update: { municipalityId: municipality.id },
    create: {
      municipalityId: municipality.id,
      provider: 'KEYCLOAK',
      issuer: demoKeycloakIssuer,
      municipalityClaim: demoMunicipalityClaim,
    },
  });

  const externalIdentity = await prisma.caseWorkerExternalIdentity.upsert({
    where: {
      municipalityProviderId_subject: {
        municipalityProviderId: provider.uuid,
        subject: demoAnnaKeycloakSubject,
      },
    },
    update: { employeeNumber: caseWorker.employeeNumber },
    create: {
      employeeNumber: caseWorker.employeeNumber,
      municipalityProviderId: provider.uuid,
      subject: demoAnnaKeycloakSubject,
    },
  });

  return { municipality, caseWorker, provider, externalIdentity };
}
