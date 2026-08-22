-- Re-enable RLS with policies scoped to auth.uid(), designed for per-request
-- Supabase clients that carry the user's JWT (see utils/supabase.ts getScopedClient).

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_row ON public.users
  FOR ALL USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

CREATE POLICY exercises_own_row ON public.exercises
  FOR ALL USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY routines_own_row ON public.routines
  FOR ALL USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY workout_sessions_own_row ON public.workout_sessions
  FOR ALL USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

CREATE POLICY set_logs_own_row ON public.set_logs
  FOR ALL USING (
    workout_session_id IN (
      SELECT id FROM public.workout_sessions
      WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  )
  WITH CHECK (
    workout_session_id IN (
      SELECT id FROM public.workout_sessions
      WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY routine_exercises_own_row ON public.routine_exercises
  FOR ALL USING (
    routine_id IN (
      SELECT id FROM public.routines
      WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  )
  WITH CHECK (
    routine_id IN (
      SELECT id FROM public.routines
      WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    )
  );
