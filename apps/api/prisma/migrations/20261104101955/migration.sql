BEGIN;

-- Legacy contacts identify only an application, so their actor cannot be
-- backfilled reliably. These development records are disposable.
DELETE FROM "ContactPerson";

-- AlterTable
ALTER TABLE "Actor" DROP COLUMN "ContactPersonName";

-- AlterTable
ALTER TABLE "ContactPerson" ADD COLUMN     "actorId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ContactPerson_actorId_key" ON "ContactPerson"("actorId");

-- AddForeignKey
ALTER TABLE "ContactPerson" ADD CONSTRAINT "ContactPerson_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
