import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { PasswordService } from '../modules/auth/password/password.service.js';

/**
 * Reads a required non-blank environment value without modifying its content.
 * @param name - The environment-variable name to read.
 * @returns The supplied environment value.
 * @throws Error when the value is missing or blank.
 */
function requiredEnvironmentValue(name: string): string {
  const value = process.env[name];

  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

/**
 * Normalizes an administrator e-mail address before it is stored.
 * @param email - The supplied administrator e-mail address.
 * @returns The trimmed lowercase e-mail address.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Creates the first local administrator from one-time environment values.
 * @returns A promise that resolves when the administrator is stored.
 * @throws Error when required values are missing or any administrator exists.
 */
async function bootstrapAdministrator(): Promise<void> {
  const connectionString = requiredEnvironmentValue('DATABASE_URL');
  const name = requiredEnvironmentValue('BOOTSTRAP_ADMIN_NAME');
  const email = normalizeEmail(
    requiredEnvironmentValue('BOOTSTRAP_ADMIN_EMAIL'),
  );
  const password = requiredEnvironmentValue('BOOTSTRAP_ADMIN_PASSWORD');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const passwordHash = await new PasswordService().hash(password);
    await prisma.$transaction(
      async (transaction) => {
        const existingAdministrator = await transaction.administrator.findFirst(
          {
            select: { uuid: true },
          },
        );

        if (existingAdministrator) {
          throw new Error(
            'An administrator already exists. The bootstrap command may only create the first account.',
          );
        }

        await transaction.administrator.create({
          data: { name, email, passwordHash },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    console.log(`Created administrator for ${email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

await bootstrapAdministrator();
