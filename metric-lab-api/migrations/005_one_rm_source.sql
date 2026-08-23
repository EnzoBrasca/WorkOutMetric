-- Records the set a manually-entered 1RM was estimated from.
--
-- exercises.one_rm is the reference every mesocycle target weight derives from.
-- Until now it was a bare number with no provenance, so the config screen could
-- not show where it came from and could not tell a value the user entered apart
-- from one backfilled out of logged history.
--
-- When one_rm_weight and one_rm_reps are both present, one_rm was estimated from
-- that set with Epley and is USER-OWNED: history never overwrites it. When they
-- are null, one_rm is either unset or was derived from logged sets.

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS one_rm_weight DECIMAL(6,2);

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS one_rm_reps INTEGER;

ALTER TABLE public.exercises
  DROP CONSTRAINT IF EXISTS exercises_one_rm_source_valid;
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_one_rm_source_valid
  CHECK (
    -- Either both halves of the source set are present, or neither is.
    (one_rm_weight IS NULL AND one_rm_reps IS NULL)
    OR (one_rm_weight > 0 AND one_rm_reps > 0)
  );
