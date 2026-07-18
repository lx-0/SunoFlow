-- Deleting a song must not cascade-delete the owner's entire PlaybackState row
-- (queue, position, volume, EQ). Scope the FK to SetNull so only the current-song
-- pointer is cleared and the rest of the player session survives.

-- DropForeignKey
ALTER TABLE "PlaybackState" DROP CONSTRAINT "PlaybackState_songId_fkey";

-- AlterTable
ALTER TABLE "PlaybackState" ALTER COLUMN "songId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PlaybackState" ADD CONSTRAINT "PlaybackState_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;
