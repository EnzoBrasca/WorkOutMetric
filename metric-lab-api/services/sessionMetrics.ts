// Pure summaries over logged workout sessions.
//
// Kept free of any database access so the arithmetic that drives the history
// screen can be tested directly. A set_logs row records completed_sets *
// completed_reps at a single weight, so its volume is the product of the three.

export interface SetLogLike {
  exercise_id?: string;
  completed_sets?: number | string | null;
  completed_reps?: number | string | null;
  weight?: number | string | null;
}

export interface SessionLike {
  id: string;
  started_at?: string | null;
  ended_at?: string | null;
  mesocycle_id?: string | null;
  mesocycle_week?: number | null;
  set_logs?: SetLogLike[] | null;
}

export interface SessionSummary {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  /** null while the session is still open, or if either timestamp is missing. */
  durationMinutes: number | null;
  mesocycleId: string | null;
  mesocycleWeek: number | null;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  exerciseCount: number;
  /** Percentage change in volume against the previous (older) session. */
  volumeDeltaPct: number | null;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function setLogVolume(log: SetLogLike): number {
  return toNumber(log.completed_sets) * toNumber(log.completed_reps) * toNumber(log.weight);
}

export function sessionVolume(logs: SetLogLike[] | null | undefined): number {
  return (logs ?? []).reduce((total, log) => total + setLogVolume(log), 0);
}

function durationMinutes(startedAt?: string | null, endedAt?: string | null): number | null {
  if (!startedAt || !endedAt) return null;

  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  const minutes = (end - start) / 60000;
  return minutes < 0 ? null : Math.round(minutes);
}

export function summarizeSession(session: SessionLike): SessionSummary {
  const logs = session.set_logs ?? [];

  return {
    id: session.id,
    startedAt: session.started_at ?? null,
    endedAt: session.ended_at ?? null,
    durationMinutes: durationMinutes(session.started_at, session.ended_at),
    mesocycleId: session.mesocycle_id ?? null,
    mesocycleWeek: session.mesocycle_week ?? null,
    totalSets: logs.reduce((total, log) => total + toNumber(log.completed_sets), 0),
    totalReps: logs.reduce(
      (total, log) => total + toNumber(log.completed_sets) * toNumber(log.completed_reps),
      0
    ),
    totalVolume: sessionVolume(logs),
    exerciseCount: new Set(logs.map((log) => log.exercise_id).filter(Boolean)).size,
    volumeDeltaPct: null,
  };
}

/**
 * Summarises a newest-first list of sessions and fills in each one's volume
 * change against the session before it in time. The oldest session, and any
 * session following one with no volume, gets a null delta rather than a
 * fabricated 0% or an Infinity from dividing by zero.
 */
export function summarizeHistory(sessions: SessionLike[]): SessionSummary[] {
  const summaries = sessions.map(summarizeSession);

  return summaries.map((summary, index) => {
    const previous = summaries[index + 1];
    if (!previous || previous.totalVolume === 0) return summary;

    const delta = ((summary.totalVolume - previous.totalVolume) / previous.totalVolume) * 100;
    return { ...summary, volumeDeltaPct: Math.round(delta * 10) / 10 };
  });
}
