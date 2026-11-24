-- AlterTable
ALTER TABLE "Applicant" ALTER COLUMN "mitIdKey" DROP NOT NULL;

-- Normalize administrator e-mail addresses before adding the unique index.
UPDATE "Administrator"
SET "email" = LOWER(BTRIM("email"));

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_cvrNumber_key" ON "Applicant"("cvrNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_mitIdKey_key" ON "Applicant"("mitIdKey");

-- CreateIndex
CREATE UNIQUE INDEX "Administrator_email_key" ON "Administrator"("email");

-- Add applicant identity rules.
ALTER TABLE "Applicant"
ADD CONSTRAINT "Applicant_identity_by_type_check"
CHECK (
    ("type" = 'Private' AND "mitIdKey" IS NOT NULL AND "cvrNumber" IS NULL)
    OR
    ("type" = 'Business' AND "mitIdKey" IS NULL AND "cvrNumber" IS NOT NULL)
);
