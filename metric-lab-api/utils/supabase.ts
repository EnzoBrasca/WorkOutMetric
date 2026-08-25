import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Per-request client scoped to the caller's JWT, so Row Level Security's
// auth.uid() resolves correctly instead of running as the anon role.
export function getScopedClient(token: string) {
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

/**
 * Bypasses RLS and can administer Auth accounts. Its only caller is the
 * registration rollback in authService — keep it that way, so this key's blast
 * radius stays one function wide.
 *
 * Built on demand rather than at import time: the key is optional, and a
 * deployment missing it must still serve every other endpoint.
 */
export function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
