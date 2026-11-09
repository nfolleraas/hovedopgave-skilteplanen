/*
  Warnings:

  - You are about to drop the column `areaId` on the `AreaSize` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Area" DROP CONSTRAINT "Area_areaDetailId_fkey";

-- DropForeignKey
ALTER TABLE "Area" DROP CONSTRAINT "Area_areaSizeId_fkey";

-- DropIndex
DROP INDEX "Area_applicationId_key";

-- DropIndex
DROP INDEX "AreaSize_areaId_key";

-- AlterTable
ALTER TABLE "Area" ALTER COLUMN "areaDetailId" DROP NOT NULL,
ALTER COLUMN "areaSizeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AreaDetail" ALTER COLUMN "direction" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AreaSize" DROP COLUMN "areaId",
ALTER COLUMN "depthInMeters" DROP NOT NULL;

-- Keep existing values; the value is length x width, so it is square meters.
ALTER TABLE "AreaSize" RENAME COLUMN "areaInCubicMeters" TO "areaInSquareMeters";

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_areaDetailId_fkey" FOREIGN KEY ("areaDetailId") REFERENCES "AreaDetail"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_areaSizeId_fkey" FOREIGN KEY ("areaSizeId") REFERENCES "AreaSize"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
