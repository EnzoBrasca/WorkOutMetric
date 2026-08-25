import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase, getScopedClient, getAdminClient } from '../utils/supabase';
import * as usersRepository from '../repositories/usersRepository';
import {
  ConflictError,
  POSTGRES_UNIQUE_VIOLATION,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors';

// Supabase Auth requires an email format, so usernames are mapped to a
// deterministic dummy email. Was duplicated in login.ts and register.ts —
// consolidated here.
export function buildEmailFromUsername(username: string): string {
  return `${username.toLowerCase()}@metriclab.app`;
}


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

// Trades a refresh token for a fresh session. The access token Supabase issues
// lives one hour; without this the mobile app kept a dead JWT in storage, still
// looked signed in, and every request 401'd — which read on screen as "the user
// has no exercises" rather than as an expired session.
//
// Returns the same { user, session } shape as login so the client can adopt the
// result through exactly one code path.
export async function refresh(refreshToken: string) {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) throw error;

  if (!data.session || !data.user) {
    throw new Error('No session returned from refresh');
  }

  // Same reasoning as login: the profile lookup runs under RLS, so it needs a
  // client carrying the new JWT.
  const db = getScopedClient(data.session.access_token);
  const user = await usersRepository.findByAuthId(db, data.user.id);

  return { user, session: data.session };
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

  try {
    const user = await usersRepository.insertUser(db, {
      auth_id: authData.user.id,
      username,
    });

    return { user, session: authData.session };
  } catch (insertError) {
    // The Auth account already exists at this point. Leaving it behind strands
    // the username forever: buildEmailFromUsername is deterministic, so every
    // later attempt to register it collides with "already registered", while
    // login fails with "User profile not found" because public.users has no
    // row. Deleting the Auth account is the compensating half of a transaction
    // that spans two systems.
    await rollbackAuthUser(authData.user.id);
    throw insertError;
  }
}

// A failed rollback must never replace the error that caused it — the caller
// needs to see why the profile insert failed, not why the cleanup did.
async function rollbackAuthUser(authId: string) {
  try {
    await getAdminClient().auth.admin.deleteUser(authId);
  } catch (rollbackError) {
    console.error('Failed to roll back orphaned auth user', authId, rollbackError);
  }
}

export async function updateProfile(
  token: string,
  newUsername: string | undefined,
  newPassword: string | undefined
) {
  // Verify the token FIRST and derive the authenticated user's id from it.
  // `user_id` from the request body is ignored entirely — it was the source of
  // the IDOR (anyone could rename another user by knowing their UUID), and the
  // guard that replaced it compared the body's public.users.id against this
  // auth.users.id. Those are independent UUIDs (migrations/001), so they never
  // matched and every profile update 403'd. The token is the only authority
  // here, which is what the authorization filter below already relied on.
  const authClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: { user }, error: authError } = await authClient.auth.getUser(token);

  if (authError || !user) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  const authenticatedUserId = user.id;
  const db = getScopedClient(token);

  // Update username using the token-derived id, via the RLS-scoped client.
  if (newUsername) {
    try {
      await usersRepository.updateUsernameByAuthId(db, authenticatedUserId, newUsername);
    } catch (error: any) {
      // users.username is UNIQUE (migrations/001). Taking someone else's name
      // is a conflict the user can resolve by picking another one, not a 500.
      if (error?.code === POSTGRES_UNIQUE_VIOLATION) {
        throw new ConflictError('That username is already taken');
      }
      throw error;
    }
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
      // Supabase rejects a password the caller chose (too short, breached,
      // same as the current one). That is the client's problem to fix, not a
      // server fault, so it must not surface as a 500.
      throw new ValidationError(errorData.msg || 'Failed to update password');
    }
  }
}

export async function updatePreferences(
  db: SupabaseClient,
  userId: string,
  preferences: any
) {
  await usersRepository.updatePreferencesById(db, userId, preferences);
}
