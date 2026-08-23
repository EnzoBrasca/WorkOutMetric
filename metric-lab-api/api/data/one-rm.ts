import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getScopedClient } from '../../utils/supabase';
import { verifyTokenAndGetUser } from '../../utils/verify';
import { respondWithError } from '../../utils/errors';
import * as exercisesService from '../../services/exercisesService';

// Sets the reference 1RM for a single exercise.
//
// Separate from /api/data/sync on purpose: that endpoint upserts the whole
// exercise list at once, and postgrest-js normalises the column set across
// rows, so carrying one_rm there would blank it on every exercise whose payload
// happened to omit it.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let user_id: string;
  let token: string;
  try {
    ({ userId: user_id, token } = await verifyTokenAndGetUser(req));
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const db = getScopedClient(token);

  const exerciseId = (req.query.exercise_id as string) || req.body?.exercise_id;

  try {
    const exercise = await exercisesService.setOneRm(db, user_id, exerciseId, req.body?.one_rm);
    return res.status(200).json({ exercise });
  } catch (error: any) {
    return respondWithError(res, error);
  }
}
