import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as authService from '../../services/authService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
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
