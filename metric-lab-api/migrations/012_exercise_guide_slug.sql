-- Which illustrated movement an exercise refers to.
--
-- The catalog is freeform text per user: two people can both log "press" and
-- mean different lifts, and nothing in the row says what the movement looks
-- like. `guide_slug` points at an entry in the @bryllim/workout-guide catalog
-- (302 movements), which is what lets the app render an illustration next to
-- the exercise while training.
--
-- Nullable and untyped on purpose:
--
--   * No CHECK and no enum. The valid slugs live in an npm package that the
--     mobile app bundles, not in this database — a constraint here would have
--     to be rewritten by migration every time that package adds a movement,
--     and would reject rows from an app version newer than the schema.
--
--   * No foreign key. There is no catalog table to point at. Mirroring 302
--     rows into Postgres would buy referential integrity over data the server
--     never reads: the API stores and returns the slug, and only the client
--     resolves it to an image.
--
--   * Nullable. Matching a typed-in name to a catalog entry is fuzzy and the
--     user drives it, so most rows will not have one. An exercise without a
--     slug renders exactly as it does today, with no illustration.
--
-- Nothing here touches set_logs, so no logged history is at risk.
--
-- Same transaction + lock timeout pattern as 006-011.

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS guide_slug TEXT;

COMMIT;
