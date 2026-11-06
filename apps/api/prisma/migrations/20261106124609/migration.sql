/*
  Warnings:

  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MessageThread` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[applicationId]` on the table `ExcavationPermit` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[applicationId]` on the table `RoadUsePermit` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `applicationId` to the `ExcavationPermit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `applicationId` to the `RoadUsePermit` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_caseWorkerId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_messageThreadId_fkey";

-- DropForeignKey
ALTER TABLE "MessageThread" DROP CONSTRAINT "MessageThread_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "MessageThread" DROP CONSTRAINT "MessageThread_caseWorkerId_fkey";

-- DropForeignKey
ALTER TABLE "MessageThread" DROP CONSTRAINT "MessageThread_municipalityId_fkey";

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'Draft';

-- AlterTable
ALTER TABLE "ExcavationPermit" ADD COLUMN     "applicationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RoadUsePermit" ADD COLUMN     "applicationId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Message";

-- DropTable
DROP TABLE "MessageThread";

-- CreateIndex
CREATE UNIQUE INDEX "ExcavationPermit_applicationId_key" ON "ExcavationPermit"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "RoadUsePermit_applicationId_key" ON "RoadUsePermit"("applicationId");
