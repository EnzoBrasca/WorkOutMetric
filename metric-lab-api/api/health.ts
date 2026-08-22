import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../utils/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Basic test to see if Supabase client initialized
    const { data, error } = await supabase.from('exercises').select('id').limit(1);
    
    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    res.status(200).json({
      status: 'ok',
      message: 'Metric Lab API is running and connected to Supabase!',
      db_status: 'connected',
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}
