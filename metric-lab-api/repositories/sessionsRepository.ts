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
  params: Record<string, unknown>
) {
  const { data, error } = await db
    .from('workout_sessions')
    .insert([params])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// The session the user is currently training in. A partial unique index
// (migrations/004) guarantees there is at most one of these per user.
export async function findOpenSessionByUserId(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from('workout_sessions')
    .select(`
      id,
      routine_id,
      started_at,
      ended_at,
      notes,
      mesocycle_id,
      mesocycle_week,
      set_logs (
        id,
        exercise_id,
        completed_sets,
        completed_reps,
        weight,
        logged_at
      )
    `)
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Scoped by user_id as well as id: RLS already restricts this, but the explicit
// filter keeps the query correct even with RLS off and makes the intent obvious.
export async function findSessionByIdAndUserId(db: SupabaseClient, id: string, userId: string) {
  const { data, error } = await db
    .from('workout_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateSessionByIdAndUserId(
  db: SupabaseClient,
  id: string,
  userId: string,
  patch: Record<string, unknown>
) {
  const { data, error } = await db
    .from('workout_sessions')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select();

  if (error) throw error;
  return data;
}

// Finished sessions only — an in-progress workout belongs in the active-session
// view, not in history.
export async function findHistoryByUserId(
  db: SupabaseClient,
  userId: string,
  limit: number,
  offset: number
) {
  const { data, error } = await db
    .from('workout_sessions')
    .select(`
      id,
      routine_id,
      started_at,
      ended_at,
      notes,
      mesocycle_id,
      mesocycle_week,
      set_logs (
        id,
        exercise_id,
        completed_sets,
        completed_reps,
        weight,
        logged_at,
        exercises ( name )
      )
    `)
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

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
