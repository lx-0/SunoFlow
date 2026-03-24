-- Add tsvector column for full-text search (not managed by Prisma, maintained by trigger)
ALTER TABLE "Song" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- GIN index for efficient full-text search
CREATE INDEX IF NOT EXISTS "Song_searchVector_idx" ON "Song" USING GIN ("searchVector");

-- Trigger function: weighted tsvector from title (A), prompt (B), lyrics (C)
CREATE OR REPLACE FUNCTION song_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.prompt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.lyrics, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: update searchVector on insert or relevant column update
DROP TRIGGER IF EXISTS song_search_vector_trigger ON "Song";
CREATE TRIGGER song_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, prompt, lyrics ON "Song"
  FOR EACH ROW EXECUTE FUNCTION song_search_vector_update();

-- Backfill existing rows
UPDATE "Song"
SET "searchVector" =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(prompt, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(lyrics, '')), 'C');
