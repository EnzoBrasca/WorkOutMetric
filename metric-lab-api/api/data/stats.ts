import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getScopedClient } from '../../utils/supabase';
import { verifyTokenAndGetUser } from '../../utils/verify';
import * as statsService from '../../services/statsService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method must be GET' });
  }

  let user_id: string;
  let token: string;
  try {
    ({ userId: user_id, token } = await verifyTokenAndGetUser(req));
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }

  const db = getScopedClient(token);

  try {
    const stats = await statsService.getStats(db, user_id);
    return res.status(200).json({ stats });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
