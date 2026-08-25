import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyTokenAndGetUser } from '../../utils/verify';
import { respondWithError } from '../../utils/errors';
import * as statsService from '../../services/statsService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method must be GET' });
  }

  let user_id: string;
  let db: SupabaseClient;
  try {
    ({ userId: user_id, db } = await verifyTokenAndGetUser(req));
  } catch (error: any) {
    return respondWithError(res, error);
  }

  try {
    const stats = await statsService.getStats(db, user_id);
    return res.status(200).json({ stats });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
