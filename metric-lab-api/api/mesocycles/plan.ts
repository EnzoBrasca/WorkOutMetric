import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getScopedClient } from '../../utils/supabase';
import { verifyTokenAndGetUser } from '../../utils/verify';
import { respondWithError } from '../../utils/errors';
import * as mesocyclesService from '../../services/mesocyclesService';

// Calculated targets for a mesocycle. Nothing here is stored: weight and reps
// are derived on every request from each exercise's 1RM and the week's
// percentage, so correcting a 1RM re-plans the rest of the block immediately.
//
//   GET /api/mesocycles/plan?id=<uuid>          -> the mesocycle's current week
//   GET /api/mesocycles/plan?id=<uuid>&week=3   -> a specific week
//   GET /api/mesocycles/plan?id=<uuid>&all=true -> every week of the block

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let user_id: string;
  let token: string;
  try {
    ({ userId: user_id, token } = await verifyTokenAndGetUser(req));
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const db = getScopedClient(token);

  const id = req.query.id as string | undefined;
  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  try {
    if (req.query.all === 'true') {
      const { mesocycle, weeks } = await mesocyclesService.getFullPlan(db, user_id, id);
      return res.status(200).json({ mesocycle, weeks });
    }

    const rawWeek = req.query.week as string | undefined;
    let week: number | undefined;
    if (rawWeek !== undefined) {
      week = Number(rawWeek);
      if (!Number.isFinite(week)) {
        return res.status(400).json({ error: `Invalid week "${rawWeek}"` });
      }
    }

    const { mesocycle, plan } = await mesocyclesService.getWeekPlan(db, user_id, id, week);
    return res.status(200).json({ mesocycle, plan });
  } catch (error: any) {
    return respondWithError(res, error);
  }
}
