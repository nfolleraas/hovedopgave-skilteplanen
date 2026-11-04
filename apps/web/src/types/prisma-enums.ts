// The Prisma schema is the single source of truth for enum values. Run
// `bun run db:generate` in apps/api before building the web app.
export {
  ApplicationType,
  Direction,
  RoadOwnership,
  RoadSection,
  RoadSide,
  Status,
} from '../../../api/src/generated/prisma/enums.js';
