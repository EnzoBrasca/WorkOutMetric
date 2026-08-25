import type { SupabaseClient } from '@supabase/supabase-js';

// All data access against public.mesocycles lives here. No business rules —
// just queries that return data or throw on error.

export async function findAllByUserId(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from('mesocycles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function findByIdAndUserId(db: SupabaseClient, id: string, userId: string) {
  const { data, error } = await db
    .from('mesocycles')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findByRoutineIdAndUserId(
  db: SupabaseClient,
  routineId: string,
  userId: string
) {
  const { data, error } = await db
    .from('mesocycles')
    .select('id, name')
    .eq('routine_id', routineId)
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function insert(db: SupabaseClient, row: Record<string, unknown>) {
  const { data, error } = await db
    .from('mesocycles')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Scoped by user_id as well as id: RLS already restricts this, but the explicit
// filter keeps the query correct even with RLS off and makes the intent obvious.
export async function updateByIdAndUserId(
  db: SupabaseClient,
  id: string,
  userId: string,
  patch: Record<string, unknown>
) {
  const { data, error } = await db
    .from('mesocycles')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select();

  if (error) throw error;
  return data;
}

export async function deleteByIdAndUserId(db: SupabaseClient, id: string, userId: string) {
  const { data, error } = await db
    .from('mesocycles')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select();

  if (error) throw error;
  return data;
}
