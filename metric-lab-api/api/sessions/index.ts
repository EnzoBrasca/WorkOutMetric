import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getScopedClient } from '../../utils/supabase';
import { verifyTokenAndGetUser } from '../../utils/verify';
import { respondWithError } from '../../utils/errors';
import * as sessionsService from '../../services/sessionsService';

// Workout session lifecycle.
//
//   POST   /api/sessions                    -> start (or resume) a workout
//   GET    /api/sessions?active=true        -> the workout currently in progress
//   GET    /api/sessions?limit=20&offset=0  -> finished sessions, newest first
//   PATCH  /api/sessions?id=<uuid>          -> finish a workout
//
// /api/sessions/sync stays as it is: the Android build already in users' hands
// posts every logged exercise there.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let user_id: string;
  let token: string;
  try {
    ({ userId: user_id, token } = await verifyTokenAndGetUser(req));
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }

  const db = getScopedClient(token);

  // The rest of the file safely uses user_id from the token, ignoring req.query.user_id
  if (req.method === 'GET') {
    try {
      if (req.query.active === 'true') {
        const active = await sessionsService.getActiveSession(db, user_id);
        return res.status(200).json(active);
      }

      const history = await sessionsService.getHistory(db, user_id, {
        limit: req.query.limit,
        offset: req.query.offset,
      });
      return res.status(200).json(history);
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  if (req.method === 'POST') {
    try {
      const { session, resumed } = await sessionsService.startSession(db, user_id, req.body);
      return res.status(resumed ? 200 : 201).json({ session, resumed });
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  if (req.method === 'PATCH') {
    const id = (req.query.id as string) || req.body?.id;
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    try {
      const session = await sessionsService.finishSession(db, user_id, id, req.body);
      return res.status(200).json({ session });
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
