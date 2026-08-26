-- What a lift is performed with, and how many of it.
--
-- Every weight in the app was a bare number, which is ambiguous for anything
-- that is not a barbell: "40" on a dumbbell press means two 20kg dumbbells to
-- one user and two 40kg dumbbells to another, and on a cable machine it means
-- one stack or the load per side. The number the user records and reads back
-- has to say which.
--
-- `equipment` is a freeform tag, not an enum -- same reasoning as routines.type
-- in 009: the app offers BARBELL/DUMBBELL/CABLE/SMITH/OTHER, and a CHECK
-- constraint would need a migration every time that list grows.
--
-- `equipment_units` is how many implements the load is split across: 1 or 2,
-- and only meaningful for DUMBBELL and CABLE. A barbell has one bar, so the
-- column stays 1 there and the UI never asks. The CHECK allows only 1 or 2
-- because the value drives a label, not arithmetic -- anything else would be
-- rendered as nonsense rather than caught.
--
-- Both columns are nullable/defaulted, so every existing exercise keeps
-- behaving exactly as it does today (a plain total weight) until the user
-- tags it. Nothing here touches set_logs, so no logged history is at risk.
--
-- Same transaction + lock timeout pattern as 006-010.

BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS equipment TEXT,
  ADD COLUMN IF NOT EXISTS equipment_units SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.exercises
  DROP CONSTRAINT IF EXISTS exercises_equipment_units_valid;

ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_equipment_units_valid
  CHECK (equipment_units IN (1, 2));

COMMIT;
