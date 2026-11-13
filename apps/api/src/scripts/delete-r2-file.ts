import { createInterface } from 'node:readline/promises';
import { R2Service } from '../modules/s3/r2.service.js';

const prompt = createInterface({
  input: process.stdin,
  output: process.stdout,
});

try {
  const key = (await prompt.question('Object key to delete: ')).trim();

  if (!key) {
    console.error('An object key is required.');
    process.exitCode = 1;
  } else {
    const confirmation = await prompt.question(`Delete "${key}"? (y/N): `);

    if (confirmation.toLowerCase() === 'y') {
      const r2Service = new R2Service();
      await r2Service.delete(key);
      console.log(`Deleted object: ${key}`);
    } else {
      console.log('Deletion cancelled.');
    }
  }
} finally {
  prompt.close();
}
