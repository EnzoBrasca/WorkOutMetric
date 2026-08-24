import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as authService from '../../services/authService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Refreshing rides this handler rather than its own file: Vercel counts every
  // file under api/ as a serverless function and the Hobby plan allows 12, so a
  // separate api/auth/refresh.ts would sit exactly on the ceiling. Same
  // consolidation trick as data/sync?resource=one-rm.
  if (req.query.grant_type === 'refresh_token') {
    const refreshToken = req.body?.refresh_token;

    if (!refreshToken) {
      return res.status(400).json({ error: 'refresh_token is required' });
    }

    try {
      const { user, session } = await authService.refresh(refreshToken);
      return res.status(200).json({ message: 'Session refreshed', user, session });
    } catch (error: any) {
      // A rejected refresh token is unrecoverable — the client must sign in
      // again — so this is a 401, same as a bad password.
      return res.status(401).json({ error: error.message });
    }
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const { user, session } = await authService.login(username, password);

    return res.status(200).json({
      message: 'Login successful',
      user,
      session,
    });
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
}
