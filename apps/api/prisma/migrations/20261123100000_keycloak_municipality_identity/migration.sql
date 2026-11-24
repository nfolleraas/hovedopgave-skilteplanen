ALTER TYPE "AuthProvider" RENAME VALUE 'ENTRA_ID' TO 'KEYCLOAK';

ALTER TABLE "MunicipalityAuthProvider"
RENAME COLUMN "tenantId" TO "municipalityClaim";

ALTER INDEX "MunicipalityAuthProvider_provider_issuer_tenantId_key"
RENAME TO "MunicipalityAuthProvider_provider_issuer_claim_key";

ALTER INDEX "MunicipalityAuthProvider_municipalityId_provider_tenantId_key"
RENAME TO "MunicipalityAuthProvider_municipality_provider_claim_key";
