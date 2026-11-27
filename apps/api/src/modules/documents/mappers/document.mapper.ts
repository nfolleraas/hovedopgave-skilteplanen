import type { Prisma } from '../../../generated/prisma/client.js';
import type { CreateDocumentDto } from '../dto/create-document.dto.js';

export type CreateDocumentData = Omit<Prisma.DocumentCreateInput, 'signPlan'>;

/**
 * Maps a document DTO and uploaded file data to Prisma document creation data.
 *
 * @param dto - The document information provided in the request.
 * @param url - The URL of the uploaded document.
 * @param r2ObjectKey - The object's storage key in Cloudflare R2.
 * @returns Prisma creation data with a connection to the associated application.
 */
export function mapCreateDocument(
  dto: CreateDocumentDto,
  url: string,
  r2ObjectKey: string,
): CreateDocumentData {
  return {
    name: dto.name,
    documentType: dto.documentType,
    url,
    r2ObjectKey,
    application: {
      connect: {
        caseNumber: dto.applicationId,
      },
    },
  };
}
