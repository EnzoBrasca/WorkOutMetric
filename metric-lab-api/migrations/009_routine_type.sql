-- Routines used to be identified by name alone (the frontend hardcoded two
-- tabs, "PUSH" and "PULL", and matched routine.name against the tab string
-- to find the right routine). Routines are now user-created and arbitrarily
-- named, so the tag that used to live in the name needs its own column.
--
-- `type` is a freeform tag, not an enum: the frontend offers PUSH/PULL/LEGS/
-- ARMS/ABS as suggestions plus a custom free-text option, so no CHECK
-- constraint restricts the values.
--
-- Same transaction + lock timeout pattern as 006-008.

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.routines
  ADD COLUMN IF NOT EXISTS type TEXT;

-- Convenience backfill for the two legacy hardcoded routines only. Any other
-- existing routine is left with type = NULL; the user tags it going forward.
UPDATE public.routines
  SET type = name
  WHERE name IN ('PUSH', 'PULL') AND type IS NULL;

COMMIT;
