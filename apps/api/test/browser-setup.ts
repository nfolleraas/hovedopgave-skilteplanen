import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

export default async function setUpBrowserDatabase(): Promise<
  () => Promise<void>
> {
  const apiPort = process.env.PLAYWRIGHT_API_PORT ?? '3190';
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error('Set DATABASE_URL before running browser tests.');

  const cwd = new URL('../', import.meta.url);
  const database = `playwright_${randomBytes(8).toString('hex')}`;
  const admin = new pg.Client({ connectionString: databaseUrl });
  const url = new URL(databaseUrl);
  url.pathname = `/${database}`;
  const applicantId = randomUUID();
  const env = {
    ...process.env,
    DATABASE_URL: url.href,
    DEV_PROFILE_APPLICANT_ID: applicantId,
    NODE_ENV: 'development',
    PORT: apiPort,
  };

  await admin.connect();
  let created = false;
  let api: ReturnType<typeof spawn> | undefined;
  let apiExited: Promise<unknown> | undefined;

  async function cleanup() {
    try {
      api?.kill();
      await apiExited;
      if (created) await admin.query(`DROP DATABASE ${database}`);
    } finally {
      await admin.end();
    }
  }

  try {
    await admin.query(`CREATE DATABASE ${database}`);
    created = true;
    const migration = spawnSync('bun', ['run', 'db:deploy'], {
      cwd,
      env,
      stdio: 'inherit',
    });
    if (migration.status !== 0) {
      throw new Error('Could not migrate the Playwright database.', {
        cause: migration.error,
      });
    }

    const db = new pg.Client({ connectionString: url.href });
    await db.connect();
    try {
      const addressId = randomUUID();
      await db.query(
        'INSERT INTO "Address" (uuid, street, "houseNumber", "postalCode", city) VALUES ($1, $2, $3, $4, $5)',
        [addressId, 'Vestergade', '1', '8000', 'Aarhus C'],
      );
      await db.query(
        'INSERT INTO "Applicant" (uuid, name, type, "phoneNumber", email, "addressId") VALUES ($1, $2, $3, $4, $5, $6)',
        [
          applicantId,
          'Oprindeligt Profilnavn',
          'Private',
          '12345678',
          'profile@example.com',
          addressId,
        ],
      );
    } finally {
      await db.end();
    }

    api = spawn(process.execPath, ['dist/main.js'], {
      cwd,
      env,
      stdio: 'inherit',
    });
    const child = api;
    apiExited = new Promise((resolve) => child.once('close', resolve));

    for (let attempt = 0; attempt < 40; attempt++) {
      if (child.exitCode !== null) break;
      try {
        const response = await fetch(
          `http://localhost:${apiPort}/api/applicants/profile`,
          {
            signal: AbortSignal.timeout(1000),
          },
        );
        if (response.ok) {
          const profile = await response.json();
          if (profile.email === 'profile@example.com') return cleanup;
        }
      } catch {
        // The API may still be starting.
      }
      await delay(250);
    }

    throw new Error(`Playwright API did not become ready on port ${apiPort}.`);
  } catch (error) {
    await cleanup();
    throw error;
  }
}
