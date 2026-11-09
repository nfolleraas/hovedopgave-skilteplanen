/*
  Warnings:

  - You are about to drop the column `ContactPersonName` on the `Actor` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[actorId]` on the table `ContactPerson` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `actorId` to the `ContactPerson` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Actor" DROP COLUMN "ContactPersonName";

-- AlterTable
ALTER TABLE "ContactPerson" ADD COLUMN     "actorId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ContactPerson_actorId_key" ON "ContactPerson"("actorId");

-- AddForeignKey
ALTER TABLE "ContactPerson" ADD CONSTRAINT "ContactPerson_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
