import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as authService from '../../services/authService';
import { respondWithError } from '../../utils/errors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // NOTE: this endpoint's contract passes the token in the body (not the
  // Authorization header like the other endpoints) — kept as-is on purpose.
  // `user_id` may still arrive from installed app builds; it is ignored, since
  // the token is what identifies the caller.
  const { token, new_username, new_password } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  try {
    await authService.updateProfile(token, new_username, new_password);

    return res.status(200).json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    return respondWithError(res, error);
  }
}
