-- AlterTable
ALTER TABLE "Actor" ADD COLUMN "addressId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Actor" ADD CONSTRAINT "Actor_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("uuid") ON DELETE RESTRICT ON UPDATE CASCADE;
