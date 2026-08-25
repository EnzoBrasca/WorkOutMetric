import type { SupabaseClient } from '@supabase/supabase-js';
import * as sessionsRepository from '../repositories/sessionsRepository';
import * as routinesRepository from '../repositories/routinesRepository';
import * as mesocyclesRepository from '../repositories/mesocyclesRepository';
import { NotFoundError, POSTGRES_UNIQUE_VIOLATION, ValidationError } from '../utils/errors';
import { summarizeHistory, summarizeSession } from './sessionMetrics';

const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 100;

// Missing values still fall back to 0, the way the old `Number(x) || 0` did.
// What changes is that a number which parses but makes no physical sense is
// now rejected instead of stored.
function requireNonNegative(value: unknown, field: string): number {
  if (value === undefined || value === null || value === '') return 0;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) {
    throw new ValidationError(`${field} cannot be negative`);
  }

  return parsed;
}

/**
 * Legacy one-shot path: create a closed session and its logs in a single call.
 *
 * Superseded by startSession/logSet/finishSession, but kept working because the
 * Android build already in users' hands posts here for every logged exercise.
 * Removing it would break session logging on every installed copy of the app.
 */
export async function syncSession(
  db: SupabaseClient,
  params: { user_id: string; routine_id: any; started_at: any; ended_at: any; logs: any[] }
) {
  const { user_id, routine_id, started_at, ended_at, logs } = params;

  // This path always produces a CLOSED session. Leaving ended_at null here
  // would create an open one, and migrations/004 permits only a single open
  // session per user — a second legacy post would then fail on the unique index.
  const closedAt = ended_at || started_at || new Date().toISOString();

  const session = await sessionsRepository.createSession(db, {
    user_id,
    routine_id,
    started_at,
    ended_at: closedAt,
  });

  const setLogsToInsert = logs.map((log: any) => ({
    workout_session_id: session.id,
    exercise_id: log.exercise_id,
    completed_sets: log.completed_sets,
    completed_reps: log.completed_reps,
    weight: log.weight,
    logged_at: log.logged_at || new Date().toISOString(),
  }));

  const insertedLogs = await sessionsRepository.insertSetLogs(db, setLogsToInsert);

  return { session, logs: insertedLogs };
}

/**
 * Opens a workout. If one is already open this returns it instead of failing:
 * reopening the app mid-workout should resume, and the database only permits
 * one open session per user anyway (migrations/004).
 */
export async function startSession(db: SupabaseClient, userId: string, input: any = {}) {
  const existing = await sessionsRepository.findOpenSessionByUserId(db, userId);
  if (existing) {
    return { session: existing, resumed: true };
  }

  const week = input.mesocycle_week;
  const hasWeek = week !== undefined && week !== null;
  if (hasWeek && !Number.isInteger(Number(week))) {
    throw new ValidationError('mesocycle_week must be an integer');
  }

  // Both ids come from the client. The foreign keys only prove the rows exist,
  // not that they belong to this user, and RLS does not police what an INSERT
  // may point at — so a session could otherwise be tagged with someone else's
  // routine or mesocycle. Check ownership explicitly. Neither lookup feeds the
  // other, so they run together.
  const [routine, mesocycle] = await Promise.all([
    input.routine_id
      ? routinesRepository.findByIdAndUserId(db, input.routine_id, userId)
      : null,
    input.mesocycle_id
      ? mesocyclesRepository.findByIdAndUserId(db, input.mesocycle_id, userId)
      : null,
  ]);

  if (input.routine_id && !routine) throw new NotFoundError('Routine not found');
  if (input.mesocycle_id && !mesocycle) throw new NotFoundError('Mesocycle not found');

  // The column's own CHECK only spans 1..52 (migrations/004), so a 4-week block
  // happily accepted "week 37" and left history claiming a week the plan never
  // had. Same range rule mesocyclesService.setCurrentWeek and getWeekPlan
  // already enforce, worded the same way.
  if (mesocycle && hasWeek) {
    const parsedWeek = Number(week);
    if (parsedWeek < 1 || parsedWeek > mesocycle.total_weeks) {
      throw new ValidationError(
        `Week ${parsedWeek} is outside this mesocycle (1-${mesocycle.total_weeks})`
      );
    }
  }

  try {
    const session = await sessionsRepository.createSession(db, {
      user_id: userId,
      routine_id: input.routine_id ?? null,
      mesocycle_id: input.mesocycle_id ?? null,
      mesocycle_week: week === undefined || week === null ? null : Number(week),
      started_at: input.started_at || new Date().toISOString(),
      ended_at: null,
      notes: input.notes ?? null,
    });

    return { session, resumed: false };
  } catch (error: any) {
    // Two taps on START race past the check above, both insert, and the partial
    // unique index (workout_sessions_one_open_per_user) rejects the loser. That
    // is the index doing its job, not a server fault — the user's workout did
    // start, so return the session that won instead of surfacing a 500.
    if (error?.code !== POSTGRES_UNIQUE_VIOLATION) throw error;

    const winner = await sessionsRepository.findOpenSessionByUserId(db, userId);
    if (!winner) throw error;

    return { session: winner, resumed: true };
  }
}

export async function getActiveSession(db: SupabaseClient, userId: string) {
  const session = await sessionsRepository.findOpenSessionByUserId(db, userId);
  return session ? { session, summary: summarizeSession(session) } : { session: null, summary: null };
}

async function requireOpenSession(db: SupabaseClient, userId: string, sessionId: string) {
  const session = await sessionsRepository.findSessionByIdAndUserId(db, sessionId, userId);
  if (!session) {
    throw new NotFoundError('Session not found');
  }
  if (session.ended_at) {
    throw new ValidationError('This session is already finished');
  }
  return session;
}

/** Records one exercise's work into an open session. */
export async function logSet(db: SupabaseClient, userId: string, sessionId: string, log: any) {
  if (!sessionId) {
    throw new ValidationError('session_id is required');
  }
  if (!log?.exercise_id) {
    throw new ValidationError('exercise_id is required');
  }

  // `Number(x) || 0` below only ever neutralised NaN — -5 is truthy and was
  // stored as-is, then flowed into sessionMetrics as negative volume and
  // meaningless percentage deltas on the history screen.
  const completedSets = requireNonNegative(log.completed_sets, 'completed_sets');
  const completedReps = requireNonNegative(log.completed_reps, 'completed_reps');
  const weight =
    log.weight === undefined || log.weight === null
      ? null
      : requireNonNegative(log.weight, 'weight');

  await requireOpenSession(db, userId, sessionId);

  // exercise_id is not ownership-checked here, deliberately. This is the
  // hottest write in the app and RLS already contains the blast radius: a
  // foreign id can only ever land in the caller's OWN set_logs, statsService
  // skips logs whose exercise is not in the caller's map, and the history
  // query's embedded exercises(name) returns null under exercises_own_row. The
  // worst case is junk in your own data, so it does not justify a round trip
  // on every logged set.
  const rows = await sessionsRepository.insertSetLogs(db, [
    {
      workout_session_id: sessionId,
      exercise_id: log.exercise_id,
      completed_sets: completedSets,
      completed_reps: completedReps,
      // Null rather than 0 when unknown: statsService derives 1RM from this
      // column, and a fabricated 0 would drag a real estimate down.
      weight,
      logged_at: log.logged_at || new Date().toISOString(),
    },
  ]);

  return rows?.[0];
}

export async function finishSession(
  db: SupabaseClient,
  userId: string,
  sessionId: string,
  input: any = {}
) {
  await requireOpenSession(db, userId, sessionId);

  const updated = await sessionsRepository.updateSessionByIdAndUserId(db, sessionId, userId, {
    ended_at: input.ended_at || new Date().toISOString(),
    ...(input.notes === undefined ? {} : { notes: input.notes }),
  });

  return updated?.[0];
}

// set_logs embeds the exercise row; postgrest returns it as an object for a
// to-one relationship but as an array when it cannot infer cardinality.
function logView(log: any) {
  const exercise = Array.isArray(log.exercises) ? log.exercises[0] : log.exercises;

  return {
    id: log.id,
    exerciseId: log.exercise_id,
    name: exercise?.name ?? null,
    completedSets: Number(log.completed_sets) || 0,
    completedReps: Number(log.completed_reps) || 0,
    weight: log.weight === null || log.weight === undefined ? null : Number(log.weight),
    loggedAt: log.logged_at,
  };
}

/** Finished sessions, newest first, each with its totals and volume delta. */
export async function getHistory(db: SupabaseClient, userId: string, options: any = {}) {
  const rawLimit = Number(options.limit);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), MAX_HISTORY_LIMIT)
    : DEFAULT_HISTORY_LIMIT;

  const rawOffset = Number(options.offset);
  const offset = Number.isFinite(rawOffset) ? Math.max(Math.trunc(rawOffset), 0) : 0;

  const rows = (await sessionsRepository.findHistoryByUserId(db, userId, limit, offset)) ?? [];
  const summaries = summarizeHistory(rows as any[]);

  return {
    sessions: summaries.map((summary, index) => ({
      ...summary,
      logs: ((rows[index] as any).set_logs ?? []).map(logView),
    })),
    limit,
    offset,
  };
}
