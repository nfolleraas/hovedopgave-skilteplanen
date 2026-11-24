import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import parserConfig from './i18next-parser.config.mjs';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const parserCli = fileURLToPath(
  new URL('../node_modules/i18next-parser/bin/cli.js', import.meta.url),
);
const localeRoot = join(appRoot, 'locales');
const tempRoot = await mkdtemp(join(tmpdir(), 'web-locale-check-'));
const outputTemplate = join(tempRoot, '$LOCALE', '$NAMESPACE.json');

function findMissingKeys(extracted, translations, prefix = '') {
  if (typeof extracted === 'string') {
    return typeof translations === 'string' && translations.trim()
      ? []
      : [prefix];
  }

  return Object.entries(extracted).flatMap(([key, value]) => {
    const translationKey = prefix ? `${prefix}.${key}` : key;
    return findMissingKeys(value, translations?.[key], translationKey);
  });
}

try {
  const result = spawnSync(
    process.execPath,
    [
      parserCli,
      'src/**/*.{ts,tsx}',
      '--config',
      'locales/i18next-parser.config.mjs',
      '--output',
      outputTemplate,
    ],
    { cwd: appRoot, stdio: 'inherit' },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  } else {
    // The files are only read, so all locales are checked at once.
    // Promise.all keeps the locale order for the report.
    const missingPerLocale = await Promise.all(
      parserConfig.locales.map(async (locale) => {
        const [extracted, translations] = await Promise.all(
          [
            join(tempRoot, locale, 'translation.json'),
            join(localeRoot, locale, 'translation.json'),
          ].map(async (path) => JSON.parse(await readFile(path, 'utf8'))),
        );
        return findMissingKeys(extracted, translations).map(
          (key) => `${locale}: ${key}`,
        );
      }),
    );
    const missingTranslations = missingPerLocale.flat();

    if (missingTranslations.length > 0) {
      console.error('Missing or empty translations:');
      console.error(missingTranslations.map((key) => `  ${key}`).join('\n'));
      process.exitCode = 1;
    } else {
      console.log('All extracted keys have translations.');
    }
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
