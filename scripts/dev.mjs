import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const apiHealthUrl = 'http://localhost:3000/api/health';
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const childProcesses = [];
let shutdownPromise;
const mode = process.argv[2] ?? 'all';

if (!['all', 'api', 'web'].includes(mode)) {
  throw new Error(`Unknown development mode: ${mode}`);
}

function startWorkspace(workspace) {
  const childProcess = spawn('bun', ['run', '--no-orphans', 'dev'], {
    cwd: resolve(repositoryRoot, 'apps', workspace),
    stdio: 'inherit',
  });
  const exited = new Promise((resolve) => {
    childProcess.once('exit', (exitCode, signal) => {
      resolve({ exitCode: exitCode ?? 1, signal, workspace });
    });
  });

  childProcesses.push({ childProcess, exited });

  return { childProcess, exited };
}

function shutDown(exitCode, signal = 'SIGTERM') {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = (async () => {
    for (const child of childProcesses) {
      if (child.childProcess.exitCode === null) {
        child.childProcess.kill(signal);
      }
    }

    await Promise.allSettled(childProcesses.map((child) => child.exited));
    process.exit(exitCode);
  })();

  return shutdownPromise;
}

process.once('SIGINT', () => void shutDown(130, 'SIGINT'));
process.once('SIGTERM', () => void shutDown(143));

async function waitForApi(apiProcess) {
  while (!apiProcess || apiProcess.exitCode === null) {
    try {
      const response = await fetch(apiHealthUrl, {
        signal: AbortSignal.timeout(1_000),
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // The API is still starting.
    }

    await delay(250);
  }

  return false;
}

async function monitorWorkspaces(workspaces) {
  const firstExit = await Promise.race(
    workspaces.map((workspace) => workspace.exited),
  );

  if (!shutdownPromise) {
    console.error(
      `${firstExit.workspace} exited (code ${firstExit.exitCode}, signal ${firstExit.signal ?? 'none'}).`,
    );
    await shutDown(firstExit.exitCode);
  }
}

async function runApi() {
  console.log('Starting API...');
  const api = startWorkspace('api');
  await monitorWorkspaces([api]);
}

async function runWeb() {
  console.log(`Waiting for API health at ${apiHealthUrl}...`);
  await waitForApi();
  console.log('API is healthy. Starting web...');
  const web = startWorkspace('web');
  await monitorWorkspaces([web]);
}

async function runAll() {
  console.log('Starting API...');
  const api = startWorkspace('api');

  if (!(await waitForApi(api.childProcess))) {
    console.error(
      `API exited before becoming healthy (code ${api.childProcess.exitCode}).`,
    );
    await shutDown(api.childProcess.exitCode || 1);
  }

  console.log(`API is healthy at ${apiHealthUrl}. Starting web...`);
  const web = startWorkspace('web');
  await monitorWorkspaces([api, web]);
}

if (mode === 'api') {
  await runApi();
} else if (mode === 'web') {
  await runWeb();
} else {
  await runAll();
}
