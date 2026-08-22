import { createClient } from '@supabase/supabase-js';
import { supabase, getScopedClient } from '../utils/supabase';
import * as usersRepository from '../repositories/usersRepository';

// Supabase Auth requires an email format, so usernames are mapped to a
// deterministic dummy email. Was duplicated in login.ts and register.ts —
// consolidated here.
export function buildEmailFromUsername(username: string): string {
  return `${username.toLowerCase()}@metriclab.app`;
}

// Thrown when the caller-supplied user_id doesn't match the authenticated
// user. Kept distinct from other errors so the handler can map it to 403
// while every other failure maps to 500 (preserves api/auth/update.ts's
// existing status-code behavior).
export class ForbiddenError extends Error {}

export async function login(username: string, password: string) {
  const email = buildEmailFromUsername(username);

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) throw authError;

  if (!authData.session) {
    throw new Error('No session returned from sign in');
  }

  // The profile lookup runs under RLS (users_own_row: auth_id = auth.uid()),
  // so it must use a client carrying the session's JWT — the anon client
  // would match zero rows.
  const db = getScopedClient(authData.session.access_token);
  const user = await usersRepository.findByAuthId(db, authData.user.id);

  return { user, session: authData.session };
}

export async function register(username: string, password: string) {
  const email = buildEmailFromUsername(username);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;

  if (!authData.user) {
    throw new Error('Failed to create user in Supabase Auth');
  }

  // The profile insert runs under RLS (users_own_row: auth_id = auth.uid()),
  // so it must use a client carrying the new session's JWT — the anon
  // client has no auth.uid() and would be rejected by the policy.
  if (!authData.session) {
    throw new Error('No session returned from sign up — email confirmation may be enabled');
  }

  const db = getScopedClient(authData.session.access_token);
  const user = await usersRepository.insertUser(db, {
    auth_id: authData.user.id,
    username,
  });

  return { user, session: authData.session };
}

export async function updateProfile(
  token: string,
  bodyUserId: string | undefined,
  newUsername: string | undefined,
  newPassword: string | undefined
) {
  // 1. Verify the token FIRST and derive the authenticated user's id from
  //    it. Never trust `user_id` from the request body for authorization —
  //    that was the source of the IDOR (anyone could rename another user by
  //    guessing/knowing their UUID).
  const authClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: { user }, error: authError } = await authClient.auth.getUser(token);

  if (authError || !user) {
    throw new Error('Invalid token');
  }

  // `bodyUserId`, if provided, is accepted only as a redundant match-check —
  // it is never used for the actual authorization filter.
  if (bodyUserId && bodyUserId !== user.id) {
    throw new ForbiddenError('user_id does not match authenticated user');
  }

  const authenticatedUserId = user.id;
  const db = getScopedClient(token);

  // 2. Update username using the token-derived id, via the RLS-scoped client.
  if (newUsername) {
    await usersRepository.updateUsernameByAuthId(db, authenticatedUserId, newUsername);
  }

  // 3. Update password if provided.
  if (newPassword) {
    // Use fetch to Supabase's auth endpoint directly to avoid session
    // pollution (updateUser doesn't take a token directly on a fresh client).
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPassword }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { msg?: string };
      throw new Error(errorData.msg || 'Failed to update password');
    }
  }
}

export async function updatePreferences(token: string, userId: string, preferences: any) {
  const db = getScopedClient(token);
  await usersRepository.updatePreferencesById(db, userId, preferences);
}
