const allowedDocumentFileExtensions = new Map<string, ReadonlySet<string>>([
  ['application/pdf', new Set(['pdf'])],
  ['image/jpeg', new Set(['jpg', 'jpeg'])],
  ['image/png', new Set(['png'])],
]);

/**
 * Gets a permitted extension when the filename and media type agree.
 * @param filename - The uploaded file name
 * @param mimeType - The reported media type of the uploaded file
 * @returns The normalized extension, or undefined when the file is not allowed
 */
export function getAllowedDocumentFileExtension(
  filename: string,
  mimeType: string,
): string | undefined {
  const extension = filename.toLowerCase().split('.').pop();
  const allowedExtensions = allowedDocumentFileExtensions.get(mimeType);

  return extension && allowedExtensions?.has(extension) ? extension : undefined;
}
