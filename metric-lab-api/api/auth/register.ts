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
    const { user, session } = await authService.register(username, password);

    return res.status(200).json({
      message: 'User registered successfully',
      user,
      session,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
