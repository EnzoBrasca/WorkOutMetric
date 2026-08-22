import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getScopedClient } from '../../utils/supabase';
import { verifyTokenAndGetUser } from '../../utils/verify';
import * as sessionsService from '../../services/sessionsService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let token_user_id: string;
  let token: string;
  try {
    ({ userId: token_user_id, token } = await verifyTokenAndGetUser(req));
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }

  const db = getScopedClient(token);

  const { routine_id, started_at, ended_at, logs } = req.body;
  const user_id = token_user_id; // Override with secure id

  if (!logs || !Array.isArray(logs)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { session, logs: insertedLogs } = await sessionsService.syncSession(db, {
      user_id,
      routine_id,
      started_at,
      ended_at,
      logs,
    });

    return res.status(200).json({
      message: 'Session synced successfully',
      session,
      logs: insertedLogs,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
