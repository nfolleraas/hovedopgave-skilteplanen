-- CreateEnum
CREATE TYPE "AuthActor" AS ENUM ('APPLICANT', 'CASE_WORKER', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "AuthAuditEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'REFRESH_SUCCESS', 'REFRESH_FAILURE', 'REFRESH_REUSE', 'ONBOARDING_CREATED', 'ONBOARDING_COMPLETED');

-- CreateEnum
CREATE TYPE "AuthLoginType" AS ENUM ('PRIVATE_APPLICANT', 'BUSINESS_APPLICANT', 'MUNICIPALITY', 'CASE_WORKER_FALLBACK', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('SIGNICAT', 'ENTRA_ID', 'LOCAL');

-- CreateTable
CREATE TABLE "AuthAuditEvent" (
    "uuid" TEXT NOT NULL,
    "eventType" "AuthAuditEventType" NOT NULL,
    "actor" "AuthActor",
    "principalId" TEXT,
    "provider" "AuthProvider",
    "success" BOOLEAN NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAuditEvent_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "AuthTransaction" (
    "uuid" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "loginType" "AuthLoginType" NOT NULL,
    "stateHash" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "pkceVerifier" TEXT NOT NULL,
    "returnPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "AuthTransaction_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "CaseWorkerExternalIdentity" (
    "uuid" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "municipalityProviderId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseWorkerExternalIdentity_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "MunicipalityAuthProvider" (
    "uuid" TEXT NOT NULL,
    "municipalityId" INTEGER NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "issuer" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MunicipalityAuthProvider_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "PendingRegistration" (
    "uuid" TEXT NOT NULL,
    "applicantType" "ApplicantType" NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "externalIdentityKey" TEXT,
    "cvrNumber" TEXT,
    "providerSubject" TEXT,
    "providerTenantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "uuid" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "principalId" TEXT NOT NULL,
    "actor" "AuthActor" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("uuid")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthTransaction_stateHash_key" ON "AuthTransaction"("stateHash");

-- CreateIndex
CREATE UNIQUE INDEX "CaseWorkerExternalIdentity_municipalityProviderId_subject_key" ON "CaseWorkerExternalIdentity"("municipalityProviderId", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "CaseWorkerExternalIdentity_employeeNumber_municipalityProviderId_key" ON "CaseWorkerExternalIdentity"("employeeNumber", "municipalityProviderId");

-- CreateIndex
CREATE UNIQUE INDEX "MunicipalityAuthProvider_provider_issuer_tenantId_key" ON "MunicipalityAuthProvider"("provider", "issuer", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MunicipalityAuthProvider_municipalityId_provider_tenantId_key" ON "MunicipalityAuthProvider"("municipalityId", "provider", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_replacedById_key" ON "RefreshToken"("replacedById");

-- AddForeignKey
ALTER TABLE "CaseWorkerExternalIdentity" ADD CONSTRAINT "CaseWorkerExternalIdentity_employeeNumber_fkey" FOREIGN KEY ("employeeNumber") REFERENCES "CaseWorker"("employeeNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseWorkerExternalIdentity" ADD CONSTRAINT "CaseWorkerExternalIdentity_municipalityProviderId_fkey" FOREIGN KEY ("municipalityProviderId") REFERENCES "MunicipalityAuthProvider"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MunicipalityAuthProvider" ADD CONSTRAINT "MunicipalityAuthProvider_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "RefreshToken"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
