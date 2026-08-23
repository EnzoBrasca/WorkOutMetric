import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getScopedClient } from '../../utils/supabase';
import { verifyTokenAndGetUser } from '../../utils/verify';
import { respondWithError } from '../../utils/errors';
import * as mesocyclesService from '../../services/mesocyclesService';

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

  // Advancing the week is the one field the user changes as the block runs.
  if (req.method === 'PATCH') {
    const id = (req.query.id as string) || req.body?.id;
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const week = Number(req.body?.current_week);
    if (!Number.isFinite(week)) {
      return res.status(400).json({ error: 'current_week is required' });
    }

    try {
      const mesocycle = await mesocyclesService.setCurrentWeek(db, user_id, id, week);
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
