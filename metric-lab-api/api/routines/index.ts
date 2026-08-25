import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyTokenAndGetUser } from '../../utils/verify';
import { respondWithError } from '../../utils/errors';
import * as routinesService from '../../services/routinesService';

// Routines and their exercise membership (public.routine_exercises).
//
// Membership lives here behind ?resource=exercises rather than in its own file
// because Vercel counts every file under api/ as a separate serverless function,
// and the Hobby plan allows 12 per deployment.

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

  const isMembership = req.query.resource === 'exercises';
  const routineId = (req.query.routine_id as string) || req.body?.routine_id;

  if (req.method === 'POST') {
    try {
      if (isMembership) {
        if (!routineId) {
          return res.status(400).json({ error: 'routine_id is required' });
        }
        const exercises = await routinesService.setRoutineExercises(
          db,
          user_id,
          routineId,
          req.body?.exercises
        );
        return res.status(200).json({ message: 'Routine exercises updated', exercises });
      }

      const routine = await routinesService.createRoutine(db, user_id, req.body);
      return res.status(201).json({ routine });
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  // Renaming a routine and retagging its type: the routines screen edits both
  // in place, and membership stays on the POST above.
  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const id = (req.query.id as string) || req.body?.id;
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      const routine = await routinesService.updateRoutine(db, user_id, id, req.body);
      return res.status(200).json({ routine });
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Like exercise deletion, removing membership has to be explicit: the
      // POST above is an upsert and can never drop a row from the routine.
      if (isMembership) {
        if (!routineId) {
          return res.status(400).json({ error: 'routine_id is required' });
        }
        const exerciseId = (req.query.exercise_id as string) || req.body?.exercise_id;
        if (!exerciseId) {
          return res.status(400).json({ error: 'exercise_id is required' });
        }

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
      }

      const id = (req.query.id as string) || req.body?.id;
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

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
