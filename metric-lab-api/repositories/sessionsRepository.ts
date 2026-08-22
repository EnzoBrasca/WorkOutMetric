import type { SupabaseClient } from '@supabase/supabase-js';

// All data access against workout_sessions + set_logs lives here. No
// business rules — just queries that return data or throw on error.

export async function findSessionsWithSetLogsByUserId(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from('workout_sessions')
    .select(`
      id,
      started_at,
      set_logs (
        exercise_id,
        weight,
        completed_reps
      )
    `)
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createSession(
  db: SupabaseClient,
  params: { user_id: string; routine_id: any; started_at: any; ended_at: any }
) {
  const { data, error } = await db
    .from('workout_sessions')
    .insert([params])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function insertSetLogs(db: SupabaseClient, rows: any[]) {
  const { data, error } = await db
    .from('set_logs')
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
}
