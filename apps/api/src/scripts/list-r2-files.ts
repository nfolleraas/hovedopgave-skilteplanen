import { R2Service } from '../modules/s3/r2.service.js';

const prefix = process.argv[2];
const r2Service = new R2Service();
let continuationToken: string | undefined;
let fileCount = 0;

do {
  const result = await r2Service.list(prefix, continuationToken);

  for (const object of result.Contents ?? []) {
    console.log(
      `${object.Key}\t${object.Size ?? 0} bytes\t${object.LastModified?.toISOString() ?? ''}`,
    );
    fileCount += 1;
  }

  continuationToken = result.IsTruncated
    ? result.NextContinuationToken
    : undefined;
} while (continuationToken);

console.log(`Listed ${fileCount} file(s).`);
