/*
  Warnings:

  - You are about to drop the column `rating` on the `Song` table. All the data in the column will be lost.
  - You are about to drop the column `ratingNote` on the `Song` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Song" DROP COLUMN "rating",
DROP COLUMN "ratingNote";
