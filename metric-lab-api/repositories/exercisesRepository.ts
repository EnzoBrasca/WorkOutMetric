import type { SupabaseClient } from '@supabase/supabase-js';

// All data access against public.exercises lives here. No business rules —
// just queries that return data or throw on error.

// Columns listed explicitly rather than select('*'): base_weight is dead (no
// reader anywhere in the API or the app) and created_at never reaches the
// client. sets/week/weight stay — despite reading as legacy text columns, the
// mobile app still renders them (ExerciseCard, SessionModal) and creates rows
// with them, so dropping them here would blank the config and session screens.
const CATALOG_COLUMNS =
  'id, name, muscle_group, sets, week, weight, one_rm, one_rm_weight, one_rm_reps';

export async function findAllByUserId(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from('exercises')
    .select(CATALOG_COLUMNS)
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) throw error;
  return data;
}

export async function findIdAndNameByUserId(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from('exercises')
    .select('id, name')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) throw error;
  return data;
}

/**
 * Marks the exercise deleted instead of removing the row.
 *
 * A real DELETE cascades into set_logs and routine_exercises, taking the user's
 * logged history with it. Keeping the row means the catalog stops listing the
 * exercise while every set ever logged against it survives, name included.
 *
 * The `deleted_at IS NULL` filter makes a second delete affect zero rows, so the
 * handler's "not found" branch still fires for an already-deleted exercise.
 */
export async function softDeleteByIdAndUserId(
  db: SupabaseClient,
  id: string,
  userId: string
) {
  const { data, error } = await db
    .from('exercises')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .is('deleted_at', null)
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
    // A deleted exercise has no reference lift to set; zero rows updated makes
    // the service report it as not found, which is what it is.
    .is('deleted_at', null)
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
