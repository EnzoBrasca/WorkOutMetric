import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getScopedClient } from './supabase';
import { UnauthorizedError } from './errors';
import * as usersRepository from '../repositories/usersRepository';

// Supabase signs access tokens with ES256 and publishes the public key here.
// Module scope on purpose: createRemoteJWKSet caches the fetched key set in
// memory, so a warm serverless instance verifies tokens with zero network
// calls. Calling supabase.auth.getUser() instead cost an HTTP round-trip to
// Supabase Auth on every single request, before any real work started.
const jwks = createRemoteJWKSet(
  new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

export async function verifyTokenAndGetUser(req: any) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new UnauthorizedError('Unauthorized');

  let authId: string;

  try {
    // Verifies signature, expiry and issuer. An expired or tampered token
    // throws here, same as the old auth.getUser() call did.
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
    });

    if (!payload.sub) throw new Error('Token has no subject');
    authId = payload.sub;
  } catch {
    throw new UnauthorizedError('Invalid token');
  }

  // Get the public user mapping. This read runs under RLS
  // (users_own_row: auth_id = auth.uid()), so it needs the caller's JWT —
  // the anon client would match zero rows.
  //
  // The client is returned alongside the result: every handler needs one
  // carrying this same token, and building a second one per request was pure
  // duplication. A genuine query failure throws out of here as itself, so a
  // Supabase incident reads as a 500 rather than masquerading as a 401.
  const db = getScopedClient(token);
  const publicUser = await usersRepository.findIdByAuthId(db, authId);

  if (!publicUser) throw new UnauthorizedError('User profile not found');

  return { userId: publicUser.id as string, token, db };
}
