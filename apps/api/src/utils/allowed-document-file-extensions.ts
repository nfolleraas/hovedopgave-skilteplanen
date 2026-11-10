const allowedDocumentFileExtensions = new Map<string, ReadonlySet<string>>([
  ['application/pdf', new Set(['pdf'])],
  ['image/jpeg', new Set(['jpg', 'jpeg'])],
  ['image/png', new Set(['png'])],
]);

export function getAllowedDocumentFileExtension(
  filename: string,
  mimeType: string,
): string | undefined {
  const extension = filename.toLowerCase().split('.').pop();
  const allowedExtensions = allowedDocumentFileExtensions.get(mimeType);

  return extension && allowedExtensions?.has(extension) ? extension : undefined;
}
