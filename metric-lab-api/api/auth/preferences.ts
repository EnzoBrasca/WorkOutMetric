import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyTokenAndGetUser } from '../../utils/verify';
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
  let token: string;
  try {
    ({ userId, token } = await verifyTokenAndGetUser(req));
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }

  try {
    await authService.updatePreferences(token, userId, preferences);

    return res.status(200).json({ message: 'Preferences updated successfully' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
