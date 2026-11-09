/*
  Warnings:

  - Added the required column `r2ObjectKey` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "r2ObjectKey" TEXT NOT NULL;
