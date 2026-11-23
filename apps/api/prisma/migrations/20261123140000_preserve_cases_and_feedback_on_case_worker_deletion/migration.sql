ALTER TABLE "Application" ADD COLUMN "municipalityId" INTEGER;

UPDATE "Application" AS application
SET "municipalityId" = worker."municipalityId"
FROM "CaseWorker" AS worker
WHERE application."caseWorkerId" = worker."employeeNumber";

ALTER TABLE "Application" ADD CONSTRAINT "Application_municipalityId_fkey"
  FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_caseWorkerId_fkey";
ALTER TABLE "Feedback" ALTER COLUMN "caseWorkerId" DROP NOT NULL;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_caseWorkerId_fkey"
  FOREIGN KEY ("caseWorkerId") REFERENCES "CaseWorker"("employeeNumber")
  ON DELETE SET NULL ON UPDATE CASCADE;
