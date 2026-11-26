DROP INDEX "Applicant_addressId_key";
CREATE INDEX "Applicant_addressId_idx" ON "Applicant"("addressId");
