-- Two changes to mesocycles, both about removing a second source of truth.
--
-- 1. A mesocycle is no longer bound to ONE routine.
--
--    routine_id made a training block apply to a single routine, which meant a
--    user training push/pull/legs needed three parallel blocks to ramp the same
--    percentages across their week. A mesocycle is a property of the training
--    period, not of one day's routine, so it now applies to every routine the
--    user has. Exercises that belong to no routine at all still get no targets
--    (that is deliberate — the app tells the user so).
--
--    Dropping the column also drops the ON DELETE RESTRICT foreign key added in
--    006_restrict_routine_delete.sql and the mesocycles_routine_id_idx index,
--    so both disappear with it. The 409 guard in routinesService.deleteRoutine
--    that mirrored that constraint is removed in the same change: with no
--    routine_id there is nothing left for a routine delete to destroy.
--
-- 2. current_week becomes an ANCHOR instead of a counter.
--
--    current_week was a number somebody had to remember to increment. Nothing
--    did, so the week only moved when the user tapped an arrow. The user wants
--    the week to advance on its own once the real calendar week ends, in
--    Argentina time, AND to be settable by hand (they may onboard a block they
--    started weeks ago outside the app).
--
--    Storing both a counter and a date would be two sources of truth for the
--    same fact -- the exact mistake this codebase already made with 1RM. So the
--    week is not stored at all any more. What is stored is the anchor:
--
--      week_anchor_week   : the week number that applied ...
--      week_anchor_monday : ... during the ART calendar week starting this Monday
--
--    and the current week is DERIVED on every read:
--
--      current_week = clamp(week_anchor_week + ART Mondays elapsed since
--                           week_anchor_monday, 1, total_weeks)
--
--    Setting the week by hand just rewrites the anchor to (N, this ART Monday),
--    so auto-advance resumes from wherever the user put it. No cron job, no
--    background task, nothing to drift. See services/weekAnchor.ts.
--
-- Argentina (America/Argentina/Buenos_Aires) is UTC-3 all year with no DST, but
-- the backfill below still asks Postgres for the zone by name rather than
-- subtracting three hours, so a future zone-database change cannot silently
-- shift everybody's anchor by a day.
--
-- Same transaction + lock timeout pattern as 006-009.

BEGIN;

SET LOCAL lock_timeout = '5s';

-- 1. Drop the routine binding.
ALTER TABLE public.mesocycles
  DROP COLUMN IF EXISTS routine_id;

-- 2. Anchor columns, backfilled from the counter they replace.
--
-- Added nullable, backfilled, then made NOT NULL: a plain NOT NULL DEFAULT
-- would stamp every existing row with the same literal and lose current_week.
ALTER TABLE public.mesocycles
  ADD COLUMN IF NOT EXISTS week_anchor_week INTEGER,
  ADD COLUMN IF NOT EXISTS week_anchor_monday DATE;

-- date_trunc('week', ...) starts the week on Monday (ISO), which is exactly the
-- boundary the app uses. The timestamp is converted into Argentina local time
-- first, so a migration run late on a Sunday night UTC still anchors to the
-- Monday the user is actually living in.
UPDATE public.mesocycles
SET
  week_anchor_week = COALESCE(current_week, 1),
  week_anchor_monday = date_trunc(
    'week',
    (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')
  )::DATE
WHERE week_anchor_week IS NULL
   OR week_anchor_monday IS NULL;

ALTER TABLE public.mesocycles
  ALTER COLUMN week_anchor_week SET NOT NULL,
  ALTER COLUMN week_anchor_monday SET NOT NULL;

ALTER TABLE public.mesocycles
  DROP CONSTRAINT IF EXISTS mesocycles_week_anchor_week_in_range;

ALTER TABLE public.mesocycles
  ADD CONSTRAINT mesocycles_week_anchor_week_in_range
  CHECK (week_anchor_week BETWEEN 1 AND total_weeks);

-- 3. Retire the counter. Its CHECK (mesocycles_current_week_in_range) goes with
-- the column.
ALTER TABLE public.mesocycles
  DROP COLUMN IF EXISTS current_week;

COMMIT;
