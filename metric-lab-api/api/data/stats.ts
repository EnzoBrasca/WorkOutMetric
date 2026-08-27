import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyTokenAndGetUser } from '../../utils/verify';
import { respondWithError } from '../../utils/errors';
import * as statsService from '../../services/statsService';
import * as monthlyOneRmService from '../../services/monthlyOneRmService';

// The monthly 1RM comparison lives here behind ?resource=monthly-one-rm
// rather than in its own file for the same reason api/mesocycles/index.ts
// branches on ?resource=plan: Vercel counts every file under api/ as a
// separate serverless function, and the Hobby plan allows 12 per deployment.

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

  // Per-exercise best implied 1RM for the previous vs. current calendar month
  // (Argentine calendar, see weekAnchor.ts), scoped to one routine -- the
  // mobile "1RM comparison" bar chart.
  //
  //   ?resource=monthly-one-rm&routineId=<uuid>
  if (req.query.resource === 'monthly-one-rm') {
    const routineId = req.query.routineId as string | undefined;
    if (!routineId) {
      return res.status(400).json({ error: 'routineId is required' });
    }

    try {
      const comparison = await monthlyOneRmService.getMonthlyOneRmComparison(db, user_id, routineId);
      return res.status(200).json({ comparison });
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  try {
    const stats = await statsService.getStats(db, user_id);
    return res.status(200).json({ stats });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
