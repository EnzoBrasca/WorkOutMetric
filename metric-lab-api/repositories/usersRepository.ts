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

// Used by utils/verify.ts's profile lookup — mirrors its original behavior
// of only selecting `id` and silently ignoring a query error (the caller
// treats a null row as "profile not found").
export async function findIdByAuthId(db: SupabaseClient, authId: string) {
  const { data } = await db
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single();

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
