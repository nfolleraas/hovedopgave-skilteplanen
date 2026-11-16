-- AlterTable
CREATE SEQUENCE municipality_id_seq;
ALTER TABLE "Municipality" ALTER COLUMN "id" SET DEFAULT nextval('municipality_id_seq');
ALTER SEQUENCE municipality_id_seq OWNED BY "Municipality"."id";
