/*
  Warnings:

  - You are about to drop the column `signPlanId` on the `Document` table. All the data in the column will be lost.
  - The primary key for the `SignPlan` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `date` on the `SignPlan` table. All the data in the column will be lost.
  - You are about to drop the column `documentType` on the `SignPlan` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `SignPlan` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `SignPlan` table. All the data in the column will be lost.
  - You are about to drop the column `uuid` on the `SignPlan` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[documentId]` on the table `SignPlan` will be added. If there are existing duplicate values, this will fail.
  - Made the column `documentId` on table `SignPlan` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_signPlanId_fkey";

-- DropIndex
DROP INDEX "Document_signPlanId_key";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "signPlanId";

-- AlterTable
ALTER TABLE "SignPlan" DROP CONSTRAINT "SignPlan_pkey",
DROP COLUMN "date",
DROP COLUMN "documentType",
DROP COLUMN "name",
DROP COLUMN "url",
DROP COLUMN "uuid",
ALTER COLUMN "documentId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SignPlan_documentId_key" ON "SignPlan"("documentId");

-- AddForeignKey
ALTER TABLE "SignPlan" ADD CONSTRAINT "SignPlan_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("uuid") ON DELETE CASCADE ON UPDATE CASCADE;
