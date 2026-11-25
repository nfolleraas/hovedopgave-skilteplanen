-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "actorEmployeeNumber" TEXT NOT NULL,
    "targetEmployeeNumber" TEXT,
    "details" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorEmployeeNumber_idx" ON "AuditLog"("actorEmployeeNumber");

-- CreateIndex
CREATE INDEX "AuditLog_targetEmployeeNumber_idx" ON "AuditLog"("targetEmployeeNumber");
