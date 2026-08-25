import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyTokenAndGetUser } from '../../utils/verify';
import { respondWithError } from '../../utils/errors';
import * as authService from '../../services/authService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { preferences } = req.body;

  if (!preferences) {
    return res.status(400).json({ error: 'Preferences object is required' });
  }

  let userId: string;
  let db: SupabaseClient;
  try {
    ({ userId, db } = await verifyTokenAndGetUser(req));
  } catch (error: any) {
    return respondWithError(res, error);
  }

  try {
    await authService.updatePreferences(db, userId, preferences);

    return res.status(200).json({ message: 'Preferences updated successfully' });
  } catch (error: any) {
    return respondWithError(res, error);
  }
}
