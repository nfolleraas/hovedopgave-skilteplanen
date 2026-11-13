import { promises as dns } from 'node:dns';
import net from 'node:net';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHost(host: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await dns.lookup(host);
      return;
    } catch {
      await sleep(250);
    }
  }

  throw new Error(
    `Could not resolve database host "${host}" within ${timeoutMs}ms. ` +
      'Ensure the devcontainer docker compose services are running.',
  );
}

async function waitForPort(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.connect({ host, port });
        const timer = setTimeout(() => {
          socket.destroy();
          reject(new Error('timeout'));
        }, 1000);

        socket.once('connect', () => {
          clearTimeout(timer);
          socket.end();
          resolve();
        });
        socket.once('error', (error) => {
          clearTimeout(timer);
          socket.destroy();
          reject(error);
        });
      });

      return;
    } catch {
      await sleep(250);
    }
  }

  throw new Error(
    `Could not connect to database at ${host}:${port} within ${timeoutMs}ms. ` +
      'Ensure Postgres is running and reachable from the test environment.',
  );
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL must be set to run API end-to-end tests. ' +
      'The devcontainer should provide this automatically.',
  );
}

const parsed = new URL(databaseUrl);
const host = parsed.hostname;
const port = Number(parsed.port || '5432');

await waitForHost(host, 20_000);
await waitForPort(host, port, 20_000);

