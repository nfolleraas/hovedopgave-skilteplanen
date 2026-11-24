ALTER TYPE "TrafficChange" ADD VALUE 'SpeedLimitWorkZoneAndTrafficSafety';

ALTER TABLE "Application"
    ADD COLUMN "trafficChanges" "TrafficChange"[] NOT NULL DEFAULT ARRAY[]::"TrafficChange"[];

UPDATE "Application"
SET "trafficChanges" = ARRAY["trafficChange"]
WHERE "trafficChange" IS NOT NULL;

ALTER TABLE "Application" DROP COLUMN "trafficChange";
