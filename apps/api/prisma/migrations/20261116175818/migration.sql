-- DropIndex
DROP INDEX "CaseWorker_municipalityId_key";

-- RenameIndex
ALTER INDEX "CaseWorkerExternalIdentity_employeeNumber_municipalityProviderI" RENAME TO "CaseWorkerExternalIdentity_employeeNumber_municipalityProvi_key";
