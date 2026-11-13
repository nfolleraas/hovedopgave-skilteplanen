import type { Prisma } from '../../../generated/prisma/client.js';
import { mapCreateDocument } from '../../documents/mappers/document.mapper.js';
import { CreateSignPlanDto } from '../dto/create-sign-plan.dto.js';

export type CreateSignPlanData = Prisma.SignPlanCreateInput;

/**
 * Maps a sign plan DTO and uploaded file data to Prisma sign plan creation data.
 * Reuses the document mapper to create the associated document.
 *
 * @param dto - The sign plan information provided in the request.
 * @param url - The URL of the uploaded sign plan document.
 * @param r2ObjectKey - The object's storage key in Cloudflare R2.
 * @returns Prisma creation data containing the sign plan and its document.
 */
export function mapCreateSignPlan(
  dto: CreateSignPlanDto,
  url: string,
  r2ObjectKey: string,
): CreateSignPlanData {
  return {
    signPlanType: dto.signPlanType,
    group: dto.group,
    plan: dto.plan,
    document: {
      create: mapCreateDocument(dto, url, r2ObjectKey),
    },
  };
}
