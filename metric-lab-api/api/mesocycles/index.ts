import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyTokenAndGetUser } from '../../utils/verify';
import { respondWithError } from '../../utils/errors';
import * as mesocyclesService from '../../services/mesocyclesService';

// Mesocycles and their calculated week plans.
//
// The plan lives here behind ?resource=plan rather than in its own file because
// Vercel counts every file under api/ as a separate serverless function, and the
// Hobby plan allows 12 per deployment.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let user_id: string;
  let db: SupabaseClient;
  try {
    ({ userId: user_id, db } = await verifyTokenAndGetUser(req));
  } catch (error: any) {
    return respondWithError(res, error);
  }

  // The rest of the file safely uses user_id from the token, ignoring req.query.user_id
  if (req.method === 'GET') {
    try {
      // Calculated targets. Nothing here is stored: weight and reps are derived
      // on every request from each exercise's 1RM and the week's percentage, so
      // correcting a 1RM re-plans the rest of the block immediately.
      //
      //   ?resource=plan&id=<uuid>            -> the mesocycle's current week
      //   ?resource=plan&id=<uuid>&week=3     -> a specific week
      //   ?resource=plan&id=<uuid>&all=true   -> every week of the block
      if (req.query.resource === 'plan') {
        const id = req.query.id as string | undefined;
        if (!id) {
          return res.status(400).json({ error: 'id is required' });
        }

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
      }

      const mesocycles = await mesocyclesService.listMesocycles(db, user_id);
      return res.status(200).json({ mesocycles });
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  if (req.method === 'POST') {
    try {
      const mesocycle = await mesocyclesService.createMesocycle(db, user_id, req.body);
      return res.status(201).json({ mesocycle });
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  // Setting the week is the one field the user changes as the block runs.
  //
  // This is ABSOLUTE, not a step: the week normally advances on its own every
  // Monday 00:00 Argentina time (services/weekAnchor.ts), and this is the
  // override for a user onboarding a block they started outside the app. It
  // re-anchors rather than freezing, so auto-advance resumes from here.
  if (req.method === 'PATCH') {
    const id = (req.query.id as string) || req.body?.id;
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const week = Number(req.body?.week);
    if (!Number.isFinite(week)) {
      return res.status(400).json({ error: 'week is required' });
    }

    try {
      const mesocycle = await mesocyclesService.setWeek(db, user_id, id, week);
      return res.status(200).json({ mesocycle });
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  if (req.method === 'DELETE') {
    const id = (req.query.id as string) || req.body?.id;
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    try {
      const { deleted } = await mesocyclesService.deleteMesocycle(db, user_id, id);
      if (deleted === 0) {
        return res.status(404).json({ error: 'Mesocycle not found' });
      }
      return res.status(200).json({ message: 'Mesocycle deleted' });
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
