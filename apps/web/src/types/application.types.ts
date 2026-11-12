import { ApplicationType } from './prisma-enums.js';

/**
 * The application types the system supports. The Prisma enum also has
 * RoadUsePermitEvent, but events are not part of the system, so the app only
 * uses these two.
 */
export const supportedApplicationTypes = [
  ApplicationType.ExcavationPermit,
  ApplicationType.RoadUsePermit,
] as const;

export type SupportedApplicationType =
  (typeof supportedApplicationTypes)[number];
