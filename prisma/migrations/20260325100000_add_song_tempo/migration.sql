-- AlterTable
ALTER TABLE "Song" ADD COLUMN "tempo" INTEGER;

-- Backfill tempo from tags field (e.g. "120bpm", "120 bpm")
UPDATE "Song"
SET tempo = (regexp_match(LOWER(tags), '(\d+)\s*bpm'))[1]::integer
WHERE tags IS NOT NULL
  AND LOWER(tags) ~ '\d+\s*bpm'
  AND (regexp_match(LOWER(tags), '(\d+)\s*bpm'))[1]::integer BETWEEN 40 AND 300;

-- CreateIndex
CREATE INDEX "Song_userId_tempo_idx" ON "Song"("userId", "tempo");
