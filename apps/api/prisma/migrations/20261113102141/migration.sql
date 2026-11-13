/*
  Warnings:

  - You are about to drop the column `applicationId` on the `SignPlan` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "SignPlan" DROP CONSTRAINT "SignPlan_applicationId_fkey";

-- AlterTable
ALTER TABLE "SignPlan" DROP COLUMN "applicationId",
ADD CONSTRAINT "SignPlan_pkey" PRIMARY KEY ("documentId");

-- DropIndex
DROP INDEX "SignPlan_documentId_key";
