BEGIN;

-- Legacy actors have no address to backfill. Their development data is
-- disposable; deleting them also removes their application join rows.
DELETE FROM "Actor";

-- AlterTable
ALTER TABLE "Actor" ADD COLUMN "addressId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Actor" ADD CONSTRAINT "Actor_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
