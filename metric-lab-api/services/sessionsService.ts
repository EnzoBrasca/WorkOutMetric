import type { SupabaseClient } from '@supabase/supabase-js';
import * as sessionsRepository from '../repositories/sessionsRepository';

export async function syncSession(
  db: SupabaseClient,
  params: { user_id: string; routine_id: any; started_at: any; ended_at: any; logs: any[] }
) {
  const { user_id, routine_id, started_at, ended_at, logs } = params;

  // 1. Create Workout Session
  const session = await sessionsRepository.createSession(db, { user_id, routine_id, started_at, ended_at });

  // 2. Format logs for bulk insert
  const setLogsToInsert = logs.map((log: any) => ({
    workout_session_id: session.id,
    exercise_id: log.exercise_id,
    completed_sets: log.completed_sets,
    completed_reps: log.completed_reps,
    weight: log.weight,
    logged_at: log.logged_at || new Date().toISOString(),
  }));

  // 3. Insert Set Logs
  const insertedLogs = await sessionsRepository.insertSetLogs(db, setLogsToInsert);

  return { session, logs: insertedLogs };
}
