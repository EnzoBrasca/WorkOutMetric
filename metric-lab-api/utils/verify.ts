import { supabase, getScopedClient } from './supabase';
import * as usersRepository from '../repositories/usersRepository';

export async function verifyTokenAndGetUser(req: any) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new Error('Unauthorized');

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) throw new Error('Invalid token');

  // Get the public user mapping. This read runs under RLS
  // (users_own_row: auth_id = auth.uid()), so it needs the caller's JWT —
  // the anon client would match zero rows.
  const publicUser = await usersRepository.findIdByAuthId(getScopedClient(token), user.id);

  if (!publicUser) throw new Error('User profile not found');

  return { userId: publicUser.id as string, token }; // public user UUID + raw JWT for RLS-scoped clients
}
