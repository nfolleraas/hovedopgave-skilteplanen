// The Prisma schema is the single source of truth for enum values. Run
// `bun run db:generate` in apps/api before building the web app.
export {
  ActorRole,
  ApplicationType,
  Availability,
  CableSubtype,
  CableType,
  Direction,
  ExecutionMethod,
  MaterialType,
  PermitType,
  RoadOwnership,
  RoadSection,
  RoadSide,
  SignPlanType,
  Status,
  TrafficCalmingMeasureScope,
  TrafficCalmingMeasureType,
  TrafficChange,
  Usage,
  WorkCategory,
} from '../../../api/src/generated/prisma/enums.js';
