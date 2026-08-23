import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getScopedClient } from '../../utils/supabase';
import { verifyTokenAndGetUser } from '../../utils/verify';
import { respondWithError } from '../../utils/errors';
import * as routinesService from '../../services/routinesService';

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
    const id = req.query.id as string | undefined;

    try {
      if (id) {
        const routine = await routinesService.getRoutine(db, user_id, id);
        return res.status(200).json({ routine });
      }

      const routines = await routinesService.listRoutines(db, user_id);
      return res.status(200).json({ routines });
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  if (req.method === 'POST') {
    try {
      const routine = await routinesService.createRoutine(db, user_id, req.body);
      return res.status(201).json({ routine });
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
      const { deleted } = await routinesService.deleteRoutine(db, user_id, id);
      if (deleted === 0) {
        return res.status(404).json({ error: 'Routine not found' });
      }
      return res.status(200).json({ message: 'Routine deleted' });
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
