import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getScopedClient } from '../../utils/supabase';
import { verifyTokenAndGetUser } from '../../utils/verify';
import { respondWithError } from '../../utils/errors';
import * as sessionsService from '../../services/sessionsService';

// Records one exercise's work into the open workout session.
//
//   POST /api/sessions/logs?session_id=<uuid>
//   body: { exercise_id, completed_sets, completed_reps, weight?, logged_at? }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let user_id: string;
  let token: string;
  try {
    ({ userId: user_id, token } = await verifyTokenAndGetUser(req));
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const db = getScopedClient(token);
  const sessionId = (req.query.session_id as string) || req.body?.session_id;

  try {
    const log = await sessionsService.logSet(db, user_id, sessionId, req.body);
    return res.status(201).json({ log });
  } catch (error: any) {
    return respondWithError(res, error);
  }
}
