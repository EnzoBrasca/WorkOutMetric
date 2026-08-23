-- Mesocycle support: week-based progressive overload.
--
-- Adds:
--   - exercises.one_rm : the reference 1RM every target weight is derived from
--   - mesocycles       : a multi-week training block bound to a routine
--
-- Per-week target weight and reps are deliberately NOT stored. They are derived
-- from one_rm and the mesocycle's percentage ramp (see
-- services/mesocycleCalculator.ts), so correcting a 1RM immediately re-plans
-- every remaining week instead of leaving stale numbers behind.
--
-- This migration is additive. exercises.sets/week/weight are left in place so
-- the current mobile build keeps working; they are superseded by
-- routine_exercises.target_sets and the calculated targets.

-- 1. Reference 1RM per exercise.
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS one_rm DECIMAL(6,2);

-- Backfill from logged history where any exists, using the same Epley formula
-- as services/statsService.ts. Exercises with no history stay NULL and the API
-- reports them as needing a 1RM before they can be planned.
UPDATE public.exercises e
SET one_rm = sub.max_one_rm
FROM (
  SELECT
    sl.exercise_id,
    MAX(sl.weight * (1 + sl.completed_reps::DECIMAL / 30)) AS max_one_rm
  FROM public.set_logs sl
  WHERE sl.weight IS NOT NULL
    AND sl.weight > 0
    AND sl.completed_reps > 0
  GROUP BY sl.exercise_id
) sub
WHERE e.id = sub.exercise_id
  AND e.one_rm IS NULL;

-- 2. Mesocycles.
CREATE TABLE IF NOT EXISTS public.mesocycles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_weeks INTEGER NOT NULL DEFAULT 4,
  -- Ramp: week 1 sits at start_pct, each later training week adds increment_pct.
  -- Defaults reproduce the 60% -> 70% -> 80% three-week block.
  start_pct DECIMAL(5,2) NOT NULL DEFAULT 60,
  increment_pct DECIMAL(5,2) NOT NULL DEFAULT 10,
  -- A deload week holds its own percentage and does not consume a ramp step.
  deload_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  deload_week INTEGER,
  deload_pct DECIMAL(5,2) NOT NULL DEFAULT 50,
  current_week INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT mesocycles_total_weeks_valid
    CHECK (total_weeks BETWEEN 1 AND 52),
  CONSTRAINT mesocycles_current_week_in_range
    CHECK (current_week BETWEEN 1 AND total_weeks),
  CONSTRAINT mesocycles_deload_week_in_range
    CHECK (deload_week IS NULL OR deload_week BETWEEN 1 AND total_weeks),
  CONSTRAINT mesocycles_deload_week_present
    CHECK (NOT deload_enabled OR deload_week IS NOT NULL),
  CONSTRAINT mesocycles_start_pct_valid
    CHECK (start_pct > 0 AND start_pct <= 100),
  CONSTRAINT mesocycles_deload_pct_valid
    CHECK (deload_pct > 0 AND deload_pct <= 100),
  CONSTRAINT mesocycles_increment_pct_valid
    CHECK (increment_pct >= 0 AND increment_pct <= 100)
);

CREATE INDEX IF NOT EXISTS mesocycles_user_id_idx ON public.mesocycles(user_id);
CREATE INDEX IF NOT EXISTS mesocycles_routine_id_idx ON public.mesocycles(routine_id);

ALTER TABLE public.mesocycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mesocycles_own_row ON public.mesocycles;
CREATE POLICY mesocycles_own_row ON public.mesocycles
  FOR ALL USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- 3. Promote the flat exercise list into real routines.
--
-- Until now `routines` and `routine_exercises` existed but were never written
-- to: the mobile app grouped exercises client-side by exercises.muscle_group
-- (which carries the frontend's 'push'/'pull' tag). A mesocycle needs a real
-- routine to attach to, so each distinct muscle_group per user becomes one.
INSERT INTO public.routines (user_id, name, description)
SELECT DISTINCT
  e.user_id,
  UPPER(COALESCE(NULLIF(TRIM(e.muscle_group), ''), 'GENERAL')),
  'Migrated from the flat exercise list'
FROM public.exercises e
WHERE e.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.routines r
    WHERE r.user_id = e.user_id
      AND r.name = UPPER(COALESCE(NULLIF(TRIM(e.muscle_group), ''), 'GENERAL'))
  );

-- Carry the free-text "4x8" set scheme over into the real integer columns.
-- Anything that does not match the pattern falls back to the column defaults
-- rather than failing the migration.
INSERT INTO public.routine_exercises (routine_id, exercise_id, target_sets, target_reps)
SELECT
  r.id,
  e.id,
  CASE WHEN e.sets ~ '^\s*\d+\s*[xX]\s*\d+\s*$'
       THEN GREATEST(1, TRIM(split_part(LOWER(e.sets), 'x', 1))::INTEGER)
       ELSE 3 END,
  CASE WHEN e.sets ~ '^\s*\d+\s*[xX]\s*\d+\s*$'
       THEN GREATEST(1, TRIM(split_part(LOWER(e.sets), 'x', 2))::INTEGER)
       ELSE 8 END
FROM public.exercises e
JOIN public.routines r
  ON r.user_id = e.user_id
 AND r.name = UPPER(COALESCE(NULLIF(TRIM(e.muscle_group), ''), 'GENERAL'))
WHERE e.user_id IS NOT NULL
ON CONFLICT (routine_id, exercise_id) DO NOTHING;
