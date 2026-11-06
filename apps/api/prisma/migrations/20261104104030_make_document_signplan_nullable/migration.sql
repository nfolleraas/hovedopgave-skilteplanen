/*
  Warnings:

  - You are about to drop the column `documentUuid` on the `SignPlan` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_signPlanId_fkey";

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "signPlanId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SignPlan" DROP COLUMN "documentUuid",
ADD COLUMN     "documentId" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_signPlanId_fkey" FOREIGN KEY ("signPlanId") REFERENCES "SignPlan"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
