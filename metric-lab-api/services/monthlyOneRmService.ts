import type { SupabaseClient } from '@supabase/supabase-js';
import * as routinesRepository from '../repositories/routinesRepository';
import * as sessionsRepository from '../repositories/sessionsRepository';
import { blendedOneRm } from './oneRmCalculator';
import { artDateOf, artMidnightUtc } from './weekAnchor';

/**
 * Per-exercise 1RM comparison between the previous calendar month and the
 * current one, scoped to a single routine, for the mobile "1RM comparison"
 * bar chart.
 *
 * This is a genuine calendar-month figure, unlike statsService's
 * `historyValue`, which is the best 1RM across the last STATS_HISTORY_LIMIT
 * sessions regardless of when they happened. Months here are Argentine
 * calendar months (see weekAnchor.ts for why the anchor is ART rather than
 * UTC), so a set logged late at night still lands in the month the user
 * actually lived it in.
 */

export interface MonthlyOneRmComparison {
  exerciseId: string;
  exerciseName: string;
  /** Best implied 1RM logged last calendar month, or null if nothing was logged. */
  previousMonth: number | null;
  /** Best implied 1RM logged this calendar month, or null if nothing was logged. */
  currentMonth: number | null;
}

interface MonthWindow {
  start: Date;
  end: Date;
}

// First day of the given month, expressed as YYYY-MM-DD, tolerating a
// monthIndex0 outside 0-11 so the caller doesn't have to special-case
// December -> January or January -> December itself.
function firstOfMonth(year: number, monthIndex0: number): string {
  const normalizedMonth = ((monthIndex0 % 12) + 12) % 12;
  const yearOffset = Math.floor(monthIndex0 / 12);
  return `${year + yearOffset}-${String(normalizedMonth + 1).padStart(2, '0')}-01`;
}

/**
 * The [start, end) ART-anchored windows for the current calendar month and
 * the one before it, as real UTC instants ready to compare against a
 * TIMESTAMPTZ column.
 */
export function monthWindowsFor(now: Date = new Date()): {
  current: MonthWindow;
  previous: MonthWindow;
} {
  const [year, month] = artDateOf(now).split('-').map(Number); // month is 1-indexed
  const currentIndex0 = month - 1;

  const currentStartDate = firstOfMonth(year, currentIndex0);
  const currentEndDate = firstOfMonth(year, currentIndex0 + 1);
  const previousStartDate = firstOfMonth(year, currentIndex0 - 1);

  return {
    current: { start: artMidnightUtc(currentStartDate), end: artMidnightUtc(currentEndDate) },
    previous: { start: artMidnightUtc(previousStartDate), end: artMidnightUtc(currentStartDate) },
  };
}

export async function getMonthlyOneRmComparison(
  db: SupabaseClient,
  userId: string,
  routineId: string,
  now: Date = new Date()
): Promise<MonthlyOneRmComparison[]> {
  const { current, previous } = monthWindowsFor(now);

  // Three independent reads: none feeds another, so they run concurrently.
  const [routineExercises, previousLogs, currentLogs] = await Promise.all([
    routinesRepository.findExercisesByRoutineId(db, routineId),
    sessionsRepository.findSetLogsByUserIdAndDateRange(
      db,
      userId,
      previous.start.toISOString(),
      previous.end.toISOString()
    ),
    sessionsRepository.findSetLogsByUserIdAndDateRange(
      db,
      userId,
      current.start.toISOString(),
      current.end.toISOString()
    ),
  ]);

  // Seed one entry per routine exercise first, so an exercise with zero logged
  // sets in either month still appears in the output instead of being dropped.
  const order: string[] = [];
  const names: Record<string, string> = {};
  const best: Record<string, { previousMonth: number; currentMonth: number }> = {};

  (routineExercises ?? []).forEach((row: any) => {
    const exercise = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
    if (!exercise || best[row.exercise_id]) return;

    order.push(row.exercise_id);
    names[row.exercise_id] = exercise.name;
    best[row.exercise_id] = { previousMonth: 0, currentMonth: 0 };
  });

  const applyLogs = (logs: any[] | null, key: 'previousMonth' | 'currentMonth') => {
    logs?.forEach((log: any) => {
      const entry = best[log.exercise_id];
      if (!entry) return; // Not one of this routine's exercises.

      const implied = blendedOneRm(parseFloat(log.weight) || 0, parseInt(log.completed_reps) || 0);
      if (implied > entry[key]) entry[key] = implied;
    });
  };

  applyLogs(previousLogs, 'previousMonth');
  applyLogs(currentLogs, 'currentMonth');

  return order.map((exerciseId) => {
    const entry = best[exerciseId];
    return {
      exerciseId,
      exerciseName: names[exerciseId],
      previousMonth: entry.previousMonth > 0 ? Math.round(entry.previousMonth * 2) / 2 : null,
      currentMonth: entry.currentMonth > 0 ? Math.round(entry.currentMonth * 2) / 2 : null,
    };
  });
}
