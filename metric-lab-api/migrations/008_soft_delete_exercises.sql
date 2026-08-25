-- Deleting an exercise stops destroying the training history logged against it.
--
-- exercises.id is CASCADE-referenced from set_logs.exercise_id and
-- routine_exercises.exercise_id (001_initial_schema.sql:47,67), so removing one
-- exercise from the catalog permanently erased every set ever logged for it —
-- the volume, the basis for the 1RM estimate, all of it, with no way back.
--
-- A soft delete keeps the row. The catalog stops listing it, but the set_logs
-- survive and the history screen can still resolve exercises(name) for them,
-- which under the old cascade simply vanished along with the rows.

-- Same transaction + lock timeout as 006 and 007: adding the column needs an
-- ACCESS EXCLUSIVE lock on exercises, which a concurrent catalog read will
-- block. Both statements are idempotent, so a timed-out run is safe to repeat.

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Every catalog read filters on (user_id, deleted_at IS NULL). A partial index
-- on exactly that predicate keeps the hot path off the full-table index added
-- in 007, and stays small because it only covers live rows.
CREATE INDEX IF NOT EXISTS exercises_user_active_idx
  ON public.exercises(user_id)
  WHERE deleted_at IS NULL;

COMMIT;
