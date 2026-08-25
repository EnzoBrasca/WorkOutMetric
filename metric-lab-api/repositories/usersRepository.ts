import type { SupabaseClient } from '@supabase/supabase-js';

// All data access against public.users lives here. No business rules —
// just queries that return data or throw on error.

export async function findByAuthId(db: SupabaseClient, authId: string) {
  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Used by utils/verify.ts's profile lookup.
 *
 * A real query failure and "this user has no profile row" are different things
 * and must stay that way. This used to discard `error` and return undefined for
 * both, so an RLS misconfiguration or a Supabase outage surfaced to the caller
 * as "your session is invalid" on every authenticated endpoint — hiding a real
 * incident behind an auth error.
 *
 * maybeSingle rather than single: a missing row is an expected outcome here,
 * not an error condition.
 */
export async function findIdByAuthId(db: SupabaseClient, authId: string) {
  const { data, error } = await db
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string } | null;
}

export async function insertUser(
  db: SupabaseClient,
  params: { auth_id: string; username: string }
) {
  const { data, error } = await db
    .from('users')
    .insert([{ auth_id: params.auth_id, username: params.username }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUsernameByAuthId(
  db: SupabaseClient,
  authId: string,
  username: string
) {
  const { error } = await db
    .from('users')
    .update({ username })
    .eq('auth_id', authId);

  if (error) throw error;
}

export async function updatePreferencesById(
  db: SupabaseClient,
  userId: string,
  preferences: any
) {
  const { error } = await db
    .from('users')
    .update({ preferences })
    .eq('id', userId);

  if (error) throw error;
}
