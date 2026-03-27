-- Migration 20260326025046_add_play_event dropped the `searchVector` column from `Song`
-- but did not drop the BEFORE INSERT trigger that references NEW."searchVector".
-- The orphaned trigger caused every Song INSERT to fail with a PL/pgSQL runtime error
-- which Prisma surfaced as P2022 "The column `new` does not exist in the current database".
--
-- This migration removes the trigger and its backing function.

DROP TRIGGER IF EXISTS song_search_vector_trigger ON "Song";
DROP FUNCTION IF EXISTS song_search_vector_update();
