-- Real workout session lifecycle.
--
-- Until now the mobile app created one workout_sessions row per logged
-- exercise, with started_at == ended_at, so a "session" never represented an
-- actual workout. This migration makes an open session (ended_at IS NULL) the
-- thing a user starts, logs several exercises into, and then finishes.
--
-- Adds:
--   - workout_sessions.mesocycle_id / mesocycle_week : which block and week
--     produced these numbers, so history can be read in context
--   - a partial unique index enforcing at most one OPEN session per user
--   - an index for history listing and active-session lookup
--
-- Historical rows are left alone: they are already closed (ended_at was set to
-- started_at), so they read as one-exercise workouts rather than being
-- rewritten into something they never were.

ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS mesocycle_id UUID REFERENCES public.mesocycles(id) ON DELETE SET NULL;

ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS mesocycle_week INTEGER;

ALTER TABLE public.workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_mesocycle_week_valid;
ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_mesocycle_week_valid
  CHECK (mesocycle_week IS NULL OR mesocycle_week BETWEEN 1 AND 52);

-- Close any session that was left open before the unique index below exists.
-- Without this the index creation would fail for any user with two open rows.
-- ended_at falls back to the last set logged in the session, or to started_at
-- when nothing was logged at all.
UPDATE public.workout_sessions ws
SET ended_at = COALESCE(
  (SELECT MAX(sl.logged_at) FROM public.set_logs sl WHERE sl.workout_session_id = ws.id),
  ws.started_at,
  NOW()
)
WHERE ws.ended_at IS NULL;

-- At most one open session per user. Enforcing this in the database means a
-- double-tapped START button cannot strand an orphaned session that the user
-- can never see or finish.
CREATE UNIQUE INDEX IF NOT EXISTS workout_sessions_one_open_per_user
  ON public.workout_sessions(user_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS workout_sessions_user_started_idx
  ON public.workout_sessions(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS set_logs_session_idx
  ON public.set_logs(workout_session_id);
