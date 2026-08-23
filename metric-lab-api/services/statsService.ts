import type { SupabaseClient } from '@supabase/supabase-js';
import * as exercisesRepository from '../repositories/exercisesRepository';
import * as sessionsRepository from '../repositories/sessionsRepository';
import { epley1RM } from './oneRmCalculator';

/**
 * Per-exercise 1RM view for the config screen.
 *
 * Two numbers travel together and they mean different things:
 *   - `value` / `oneRm`: the REFERENCE 1RM (exercises.one_rm). This is what
 *     mesocycle target weights derive from. When the user entered it from a
 *     weight x reps set it is theirs, and logged history never overwrites it.
 *   - `historyValue`: the best 1RM implied by their logged sets. Shown next to
 *     the reference as information ("your best set says 105kg"), never
 *     substituted for it.
 *
 * Before this split the screen displayed the history figure but saved into
 * one_rm, so opening config and pressing save silently replaced the user's own
 * reference with a derived one.
 */
export async function getStats(db: SupabaseClient, userId: string) {
  // 1. Fetch the user's exercises, including their reference 1RM and the set it
  //    was estimated from.
  const exercises = await exercisesRepository.findAllByUserId(db, userId);

  // 2. Fetch all completed sets inside the user's workout sessions
  const sessions = await sessionsRepository.findSessionsWithSetLogsByUserId(db, userId);

  // 3. Best 1RM implied by logged history, per exercise.
  const historyMax: Record<string, { allTime: number; recent: number }> = {};

  exercises?.forEach((ex: any) => {
    historyMax[ex.id] = { allTime: 0, recent: 0 };
  });

  sessions?.forEach((session: any, index: number) => {
    const isMostRecentSession = index === 0;

    session.set_logs?.forEach((log: any) => {
      const entry = historyMax[log.exercise_id];
      if (!entry) return;

      const calculated = epley1RM(parseFloat(log.weight) || 0, parseInt(log.completed_reps) || 0);

      if (calculated > entry.allTime) entry.allTime = calculated;
      if (isMostRecentSession && calculated > entry.recent) entry.recent = calculated;
    });
  });

  // 4. Format for the frontend UI
  return (exercises ?? []).map((ex: any) => {
    const history = historyMax[ex.id] ?? { allTime: 0, recent: 0 };
    const bestHistory = history.allTime;
    const reference = ex.one_rm == null ? null : Number(ex.one_rm);

    return {
      id: ex.id,
      name: ex.name,
      // muscle_group carries the frontend's push/pull tag. It used to be
      // hardcoded to 'COMPOUND' here, which made every lift look identical.
      type: ex.muscle_group ?? null,

      // `value` stays the field the existing UI reads. It prefers the user's
      // own reference and only falls back to history when there is none.
      value:
        reference !== null
          ? String(reference)
          : bestHistory > 0
            ? String(Math.round(bestHistory))
            : '',
      prev: bestHistory > 0 ? String(Math.round(bestHistory)) : '',

      oneRm: reference,
      // The set the reference was estimated from, when the user entered one.
      oneRmWeight: ex.one_rm_weight == null ? null : Number(ex.one_rm_weight),
      oneRmReps: ex.one_rm_reps == null ? null : Number(ex.one_rm_reps),
      isManual: ex.one_rm_weight != null && ex.one_rm_reps != null,

      historyValue: bestHistory > 0 ? Math.round(bestHistory * 2) / 2 : null,
      recentValue: history.recent > 0 ? Math.round(history.recent * 2) / 2 : null,
    };
  });
}
