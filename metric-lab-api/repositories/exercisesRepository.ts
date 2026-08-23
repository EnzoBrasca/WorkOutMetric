import type { SupabaseClient } from '@supabase/supabase-js';

// All data access against public.exercises lives here. No business rules —
// just queries that return data or throw on error.

export async function findAllByUserId(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from('exercises')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function findIdAndNameByUserId(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from('exercises')
    .select('id, name')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

// Scoped by user_id as well as id: RLS already restricts this, but the explicit
// filter keeps the query correct even with RLS off and makes the intent obvious.
export async function deleteByIdAndUserId(db: SupabaseClient, id: string, userId: string) {
  const { data, error } = await db
    .from('exercises')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select();

  if (error) throw error;
  return data;
}

// one_rm is deliberately kept out of upsertMany: postgrest-js normalises the
// column set across upserted rows, so a payload where only some exercises carry
// a 1RM would write an explicit NULL over the rest. Updating it one row at a
// time is the only safe path.
export async function updateOneRmByIdAndUserId(
  db: SupabaseClient,
  id: string,
  userId: string,
  oneRm: number | null,
  sourceWeight: number | null = null,
  sourceReps: number | null = null
) {
  const { data, error } = await db
    .from('exercises')
    .update({ one_rm: oneRm, one_rm_weight: sourceWeight, one_rm_reps: sourceReps })
    .eq('id', id)
    .eq('user_id', userId)
    .select();

  if (error) throw error;
  return data;
}

export async function upsertMany(db: SupabaseClient, rows: any[]) {
  const { data, error } = await db
    .from('exercises')
    .upsert(rows, { onConflict: 'id' })
    .select();

  if (error) throw error;
  return data;
}
