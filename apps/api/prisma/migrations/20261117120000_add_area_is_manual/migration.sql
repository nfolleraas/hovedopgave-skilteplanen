-- Existing areas were created from the road search, so they default to false.
ALTER TABLE "Area" ADD COLUMN "isManual" BOOLEAN NOT NULL DEFAULT false;
