import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import parserConfig from './i18next-parser.config.mjs';

/*
 * Checks that the translation catalogs are complete and aligned:
 * 1. Every locale has the same leaf keys.
 * 2. No translation is empty.
 * 3. Every key the parser finds in the source exists in every locale.
 * Keys built at runtime cannot be found by the parser, so rules 1 and 2 are
 * what protect them.
 */

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const parserCli = fileURLToPath(
  new URL('../node_modules/i18next-parser/bin/cli.js', import.meta.url),
);
const localeRoot = join(appRoot, 'locales');
const namespace = 'translation';
const { locales } = parserConfig;

/** Flattens a nested catalog to a map of `a.b.c` keys and their values. */
function flatten(catalog, prefix = '', leaves = new Map()) {
  for (const [key, value] of Object.entries(catalog)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      flatten(value, path, leaves);
    } else {
      leaves.set(path, value);
    }
  }
  return leaves;
}

async function readCatalog(path) {
  return flatten(JSON.parse(await readFile(path, 'utf8')));
}

/** Runs the parser into a temporary folder and returns the static keys. */
async function extractStaticKeys() {
  const tempRoot = await mkdtemp(join(tmpdir(), 'web-locale-check-'));
  try {
    const result = spawnSync(
      process.execPath,
      [
        parserCli,
        'src/**/*.{ts,tsx}',
        '--config',
        'locales/i18next-parser.config.mjs',
        '--output',
        join(tempRoot, '$LOCALE', '$NAMESPACE.json'),
        '--silent',
      ],
      { cwd: appRoot, stdio: 'inherit' },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`i18next-parser exited with status ${result.status}`);
    }
    // The extracted keys are the same for every locale.
    const extracted = await readCatalog(
      join(tempRoot, locales[0], `${namespace}.json`),
    );
    return [...extracted.keys()];
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

const [staticKeys, ...catalogs] = await Promise.all([
  extractStaticKeys(),
  ...locales.map((locale) =>
    readCatalog(join(localeRoot, locale, `${namespace}.json`)),
  ),
]);

const allKeys = new Set(catalogs.flatMap((catalog) => [...catalog.keys()]));
const problems = [];

for (const [index, locale] of locales.entries()) {
  const catalog = catalogs[index];

  for (const key of allKeys) {
    if (!catalog.has(key)) {
      problems.push(`${locale}: ${key} is missing (exists in another locale)`);
    }
  }
  for (const key of staticKeys) {
    if (!catalog.has(key) && !allKeys.has(key)) {
      problems.push(`${locale}: ${key} is used in the source but missing`);
    }
  }
  for (const [key, value] of catalog) {
    if (typeof value !== 'string' || !value.trim()) {
      problems.push(`${locale}: ${key} is empty`);
    }
  }
}

if (problems.length > 0) {
  console.error('Translation catalogs are incomplete:');
  console.error(problems.map((problem) => `  ${problem}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `All ${allKeys.size} keys are translated in ${locales.join(', ')}.`,
  );
}
