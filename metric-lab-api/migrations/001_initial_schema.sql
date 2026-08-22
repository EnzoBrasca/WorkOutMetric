-- Consolidated CURRENT schema for Metric Lab API.
--
-- This is not the original supabase-schema.sql — it folds in everything that
-- was applied ad-hoc on top of it since, so that a fresh database can be
-- brought to the same state as production in one step:
--   - disable-exercises-rls.sql: exercises.sets, exercises.week, exercises.weight
--   - update-exercises.sql:      exercises.user_id
--   - add-preferences-column.sql: users.preferences
--
-- Row Level Security is intentionally NOT enabled here — see
-- migrations/002_enable_rls_scoped.sql for RLS setup.

-- 1. Users Table (extends Supabase Auth)
CREATE TABLE public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id UUID REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Routines (e.g., Push, Pull)
CREATE TABLE public.routines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Exercises Catalog
CREATE TABLE public.exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT,
  base_weight DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sets TEXT,
  week TEXT,
  weight TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE
);

-- 4. Routine Exercises (Many-to-Many with targets)
CREATE TABLE public.routine_exercises (
  routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps INTEGER NOT NULL DEFAULT 8,
  PRIMARY KEY (routine_id, exercise_id)
);

-- 5. Workout Sessions
CREATE TABLE public.workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  notes TEXT
);

-- 6. Set Logs
CREATE TABLE public.set_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  completed_sets INTEGER NOT NULL,
  completed_reps INTEGER NOT NULL,
  weight DECIMAL(5,2),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
