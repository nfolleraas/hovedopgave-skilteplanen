ALTER TABLE "Application"
    ADD COLUMN "roadPermitDraft" JSONB,
    ALTER COLUMN "trafficChange" DROP NOT NULL,
    ALTER COLUMN "applicantId" DROP NOT NULL;

-- The form permits multiple materials and safety measures on a submission.
DROP INDEX "Material_roadUsePermitId_key";
CREATE INDEX "Material_roadUsePermitId_idx" ON "Material"("roadUsePermitId");
DROP INDEX "TrafficCalmingMeasure_applicationId_key";
CREATE INDEX "TrafficCalmingMeasure_applicationId_idx" ON "TrafficCalmingMeasure"("applicationId");
