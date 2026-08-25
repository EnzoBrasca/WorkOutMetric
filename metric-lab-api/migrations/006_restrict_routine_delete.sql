-- Stops a routine delete from destroying its training block.
--
-- mesocycles.routine_id was created ON DELETE CASCADE (003_mesocycles.sql:42),
-- so deleting a routine silently erased the block's configuration — start_pct,
-- increment_pct, the deload settings, current_week — with no way back. The
-- workout_sessions that were planned from it survive (mesocycle_id is ON DELETE
-- SET NULL, 004_session_lifecycle.sql:19) but lose the plan they belonged to,
-- which is the opposite of what 004 set out to preserve.
--
-- RESTRICT makes the database refuse the delete. routinesService.deleteRoutine
-- checks for the same condition first so the user gets a 409 with the block's
-- name instead of a raw constraint violation.

-- Locking note: this touches TWO relations. DROP CONSTRAINT needs an
-- ACCESS EXCLUSIVE lock on mesocycles, and re-adding the foreign key also needs
-- a lock on the referenced table, routines. Any concurrent query that reads
-- those two in the opposite order deadlocks against this migration — which is
-- exactly what happened on the first attempt (40P01).
--
-- Taking both locks up front, in a fixed order, inside one transaction removes
-- the window where this transaction holds one and waits for the other.
-- lock_timeout makes a busy database abort in five seconds instead of hanging
-- or deadlocking, so the migration is safe to simply re-run.
--
-- Run it with the API idle if you can; retrying is harmless either way.

BEGIN;

SET LOCAL lock_timeout = '5s';

LOCK TABLE public.mesocycles IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.routines IN ACCESS EXCLUSIVE MODE;

ALTER TABLE public.mesocycles
  DROP CONSTRAINT IF EXISTS mesocycles_routine_id_fkey;

ALTER TABLE public.mesocycles
  ADD CONSTRAINT mesocycles_routine_id_fkey
  FOREIGN KEY (routine_id) REFERENCES public.routines(id) ON DELETE RESTRICT;

COMMIT;
