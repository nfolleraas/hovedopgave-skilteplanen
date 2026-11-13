/*
  Warnings:

  - A unique constraint on Applicant email (case-sensitive) will be added.
  - A unique index on lower(email) will be added to enforce case-insensitive uniqueness.
  - A unique constraint on Applicant cvrNumber will be added.
  - If there are existing duplicate values in the database, this migration will fail.
*/

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Applicant_email_key" ON "Applicant"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Applicant_email_lower_key" ON "Applicant"(lower("email"));

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Applicant_cvrNumber_key" ON "Applicant"("cvrNumber");

