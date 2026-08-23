import type { SupabaseClient } from '@supabase/supabase-js';

// All data access against public.routines and public.routine_exercises lives
// here. No business rules — just queries that return data or throw on error.

export async function findAllByUserId(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from('routines')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function findByIdAndUserId(db: SupabaseClient, id: string, userId: string) {
  const { data, error } = await db
    .from('routines')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insert(db: SupabaseClient, row: Record<string, unknown>) {
  const { data, error } = await db
    .from('routines')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Scoped by user_id as well as id: RLS already restricts this, but the explicit
// filter keeps the query correct even with RLS off and makes the intent obvious.
export async function deleteByIdAndUserId(db: SupabaseClient, id: string, userId: string) {
  const { data, error } = await db
    .from('routines')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select();

  if (error) throw error;
  return data;
}

// The embedded `exercises` row carries the 1RM every target weight is derived
// from, so the mesocycle planner can work off a single round trip.
export async function findExercisesByRoutineId(db: SupabaseClient, routineId: string) {
  const { data, error } = await db
    .from('routine_exercises')
    .select('exercise_id, target_sets, target_reps, exercises(id, name, muscle_group, one_rm)')
    .eq('routine_id', routineId);

  if (error) throw error;
  return data;
}

export async function upsertRoutineExercises(db: SupabaseClient, rows: any[]) {
  const { data, error } = await db
    .from('routine_exercises')
    .upsert(rows, { onConflict: 'routine_id,exercise_id' })
    .select();

  if (error) throw error;
  return data;
}

export async function deleteRoutineExercise(
  db: SupabaseClient,
  routineId: string,
  exerciseId: string
) {
  const { data, error } = await db
    .from('routine_exercises')
    .delete()
    .eq('routine_id', routineId)
    .eq('exercise_id', exerciseId)
    .select();

  if (error) throw error;
  return data;
}
