import type { SupabaseClient } from '@supabase/supabase-js';
import * as exercisesRepository from '../repositories/exercisesRepository';
import * as sessionsRepository from '../repositories/sessionsRepository';

// Epley Formula: 1RM = weight * (1 + (reps / 30))
function calculate1RM(weight: number, reps: number): number {
  return weight === 0 ? 0 : weight * (1 + reps / 30);
}

export async function getStats(db: SupabaseClient, userId: string) {
  // 1. Fetch user's exercises
  const exercises = await exercisesRepository.findIdAndNameByUserId(db, userId);

  // 2. Fetch all completed sets inside the user's workout sessions
  const sessions = await sessionsRepository.findSessionsWithSetLogsByUserId(db, userId);

  // 3. Process the data to calculate 1RM.
  // We find the Max 1RM for each exercise overall (value) and historically (prev).
  const statsMap: Record<string, { name: string; allTimeMax: number; recentMax: number }> = {};

  // Initialize map
  exercises?.forEach((ex: any) => {
    statsMap[ex.id] = { name: ex.name, allTimeMax: 0, recentMax: 0 };
  });

  sessions?.forEach((session: any, index: number) => {
    const isMostRecentSession = index === 0;

    session.set_logs?.forEach((log: any) => {
      if (!statsMap[log.exercise_id]) return;

      const weight = parseFloat(log.weight) || 0;
      const reps = parseInt(log.completed_reps) || 0;

      const calculated1RM = calculate1RM(weight, reps);

      if (calculated1RM > statsMap[log.exercise_id].allTimeMax) {
        statsMap[log.exercise_id].allTimeMax = calculated1RM;
      }

      if (isMostRecentSession) {
        if (calculated1RM > statsMap[log.exercise_id].recentMax) {
          statsMap[log.exercise_id].recentMax = calculated1RM;
        }
      }
    });
  });

  // 4. Format for the frontend UI
  return Object.keys(statsMap).map(id => {
    const stat = statsMap[id];
    // If there's no recent session, prev is just allTimeMax (or 0)
    return {
      id,
      name: stat.name,
      type: 'COMPOUND', // To satisfy UI filter
      value: stat.recentMax > 0 ? Math.round(stat.recentMax).toString() : Math.round(stat.allTimeMax).toString(),
      prev: Math.round(stat.allTimeMax).toString(),
    };
  });
}
