import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getScopedClient } from '../../utils/supabase';
import { verifyTokenAndGetUser } from '../../utils/verify';
import * as exercisesService from '../../services/exercisesService';

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
    // Fetch all exercises for the user
    try {
      const exercises = await exercisesService.listExercises(db, user_id);
      return res.status(200).json({ exercises });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    // Sync (Upsert) exercises
    const { exercises } = req.body;
    if (!exercises || !Array.isArray(exercises)) {
      return res.status(400).json({ error: 'exercises array is required' });
    }

    try {
      const data = await exercisesService.syncExercises(db, user_id, exercises);
      return res.status(200).json({ message: 'Sync successful', exercises: data });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    // Deleting has to be explicit: the POST sync above is an upsert and can
    // never remove a row, so without this a deleted exercise comes back on the
    // next GET.
    const id = (req.query.id as string) || req.body?.id;
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    try {
      const { deleted } = await exercisesService.deleteExercise(db, user_id, id);
      if (deleted === 0) {
        return res.status(404).json({ error: 'Exercise not found' });
      }
      return res.status(200).json({ message: 'Exercise deleted' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
