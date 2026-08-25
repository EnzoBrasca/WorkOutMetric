-- Indexes for the columns RLS and the hot paths actually filter on, plus range
-- checks that stop impossible numbers from reaching the metrics.
--
-- Wrapped in a transaction with a lock timeout for the same reason as 006: this
-- touches five relations, and a concurrent query holding locks on them in a
-- different order deadlocks the migration. Five seconds is long enough for an
-- idle database and short enough to abort cleanly on a busy one. Every
-- statement is idempotent, so a failed run is safe to repeat.

BEGIN;

SET LOCAL lock_timeout = '5s';

-- 1. users.auth_id — the highest-impact index in this file.
--
-- Every policy on every table resolves the caller through
--   (SELECT id FROM public.users WHERE auth_id = auth.uid())
-- and utils/verify.ts runs the same lookup on every authenticated request via
-- usersRepository.findIdByAuthId. auth_id was declared as a bare FK with no
-- UNIQUE and no index (001_initial_schema.sql:16), so all of that was a
-- sequential scan of public.users.
CREATE INDEX IF NOT EXISTS users_auth_id_idx ON public.users(auth_id);

-- 2. The user_id columns the catalog and routine listings filter on.
-- mesocycles already had this (003_mesocycles.sql:72); these two did not, so
-- exercisesRepository.findAllByUserId and routinesRepository.findAllByUserId
-- scanned the whole table — shared across every user, not just the caller's rows.
CREATE INDEX IF NOT EXISTS exercises_user_id_idx ON public.exercises(user_id);
CREATE INDEX IF NOT EXISTS routines_user_id_idx ON public.routines(user_id);

-- 3. FK columns pointing at exercises.id, neither of them covered.
--
-- No query filters on these today, but both carry ON DELETE CASCADE
-- (001_initial_schema.sql:47,67), so deleting one exercise forces Postgres to
-- scan both tables end to end looking for children. routine_exercises has a
-- composite PK of (routine_id, exercise_id), which cannot serve a lookup on
-- exercise_id alone because it is not the leading column.
CREATE INDEX IF NOT EXISTS set_logs_exercise_id_idx ON public.set_logs(exercise_id);
CREATE INDEX IF NOT EXISTS routine_exercises_exercise_id_idx
  ON public.routine_exercises(exercise_id);

-- 4. users_own_row is the one policy that calls auth.uid() bare.
--
-- Every other policy already nests it inside an uncorrelated scalar subquery
-- (SELECT id FROM public.users WHERE auth_id = auth.uid()), which Postgres
-- evaluates once per statement as an InitPlan. This one compared directly, so
-- wrapping it in (SELECT ...) gives it the same treatment.
DROP POLICY IF EXISTS users_own_row ON public.users;
CREATE POLICY users_own_row ON public.users
  FOR ALL USING (auth_id = (SELECT auth.uid()))
  WITH CHECK (auth_id = (SELECT auth.uid()));

-- 5. Range checks.
--
-- Nothing stopped a negative rep count from being stored: sessionsService's
-- `Number(x) || 0` only neutralises NaN, and -5 is truthy. The negative then
-- flowed into sessionMetrics and produced negative volumes and nonsense
-- percentage deltas in the history screen.
--
-- >= 0 rather than > 0 on set_logs is deliberate: `Number(x) || 0` also means
-- existing rows can legitimately hold 0, and a stricter constraint would fail
-- to validate against data already in the table.
ALTER TABLE public.set_logs
  DROP CONSTRAINT IF EXISTS set_logs_counts_non_negative;
ALTER TABLE public.set_logs
  ADD CONSTRAINT set_logs_counts_non_negative
  CHECK (
    completed_sets >= 0
    AND completed_reps >= 0
    AND (weight IS NULL OR weight >= 0)
  );

-- routine_exercises can be strict: both columns are NOT NULL DEFAULT 3/8 and
-- routinesService never writes a zero (Number(x) || 3).
ALTER TABLE public.routine_exercises
  DROP CONSTRAINT IF EXISTS routine_exercises_targets_positive;
ALTER TABLE public.routine_exercises
  ADD CONSTRAINT routine_exercises_targets_positive
  CHECK (target_sets > 0 AND target_reps > 0);

COMMIT;
