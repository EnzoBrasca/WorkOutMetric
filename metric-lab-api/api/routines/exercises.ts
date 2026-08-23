import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getScopedClient } from '../../utils/supabase';
import { verifyTokenAndGetUser } from '../../utils/verify';
import { respondWithError } from '../../utils/errors';
import * as routinesService from '../../services/routinesService';

// Membership of an exercise in a routine (public.routine_exercises).

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let user_id: string;
  let token: string;
  try {
    ({ userId: user_id, token } = await verifyTokenAndGetUser(req));
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }

  const db = getScopedClient(token);

  const routineId = (req.query.routine_id as string) || req.body?.routine_id;
  if (!routineId) {
    return res.status(400).json({ error: 'routine_id is required' });
  }

  if (req.method === 'POST') {
    try {
      const exercises = await routinesService.setRoutineExercises(
        db,
        user_id,
        routineId,
        req.body?.exercises
      );
      return res.status(200).json({ message: 'Routine exercises updated', exercises });
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  // Like exercise deletion, removal has to be explicit: the POST above is an
  // upsert and can never drop a row from the routine.
  if (req.method === 'DELETE') {
    const exerciseId = (req.query.exercise_id as string) || req.body?.exercise_id;
    if (!exerciseId) {
      return res.status(400).json({ error: 'exercise_id is required' });
    }

    try {
      const { deleted } = await routinesService.removeExercise(
        db,
        user_id,
        routineId,
        exerciseId
      );
      if (deleted === 0) {
        return res.status(404).json({ error: 'Exercise is not in this routine' });
      }
      return res.status(200).json({ message: 'Exercise removed from routine' });
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
