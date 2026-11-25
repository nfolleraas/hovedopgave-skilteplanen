BEGIN;

-- Preserve both selections before removing the combined enum value.
UPDATE "Application"
SET "trafficChanges" =
    array_remove("trafficChanges", 'SpeedLimitWorkZoneAndTrafficSafety')
    || ARRAY(
        SELECT change
        FROM unnest(ARRAY['SpeedLimitWorkZone', 'SpeedLimitTrafficSafety']::"TrafficChange"[]) AS component(change)
        WHERE change <> ALL("trafficChanges")
    )
WHERE 'SpeedLimitWorkZoneAndTrafficSafety' = ANY("trafficChanges");

CREATE TYPE "TrafficChange_new" AS ENUM (
    'SpeedLimitWorkZone',
    'SpeedLimitTrafficSafety',
    'OnewayTraffic',
    'TrafficLight',
    'NoStoppingAndParking',
    'UnconditionalObligationInIntersection'
);

ALTER TABLE "Application" ALTER COLUMN "trafficChanges" DROP DEFAULT;
ALTER TABLE "Application" ALTER COLUMN "trafficChanges" TYPE "TrafficChange_new"[]
    USING ("trafficChanges"::text[]::"TrafficChange_new"[]);
ALTER TYPE "TrafficChange" RENAME TO "TrafficChange_old";
ALTER TYPE "TrafficChange_new" RENAME TO "TrafficChange";
DROP TYPE "TrafficChange_old";
ALTER TABLE "Application" ALTER COLUMN "trafficChanges" SET DEFAULT ARRAY[]::"TrafficChange"[];

COMMIT;
