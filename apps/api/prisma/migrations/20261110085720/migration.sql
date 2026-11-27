-- DropIndex
DROP INDEX "SignPlan_applicationId_key";

-- AlterTable
ALTER TABLE "SignPlan" ALTER COLUMN "group" DROP NOT NULL,
ALTER COLUMN "plan" DROP NOT NULL;
