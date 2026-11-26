ALTER TABLE "AuditLog"
    ALTER COLUMN "actorEmployeeNumber" DROP NOT NULL,
    ADD COLUMN "actorApplicantId" TEXT,
    ADD COLUMN "targetApplicantId" TEXT;

CREATE INDEX "AuditLog_targetApplicantId_idx" ON "AuditLog"("targetApplicantId");
