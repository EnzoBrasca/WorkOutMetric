import type { SupabaseClient } from '@supabase/supabase-js';
import * as mesocyclesRepository from '../repositories/mesocyclesRepository';
import * as routinesRepository from '../repositories/routinesRepository';
import { NotFoundError, ValidationError } from '../utils/errors';
import {
  MesocycleConfig,
  PlannedExerciseInput,
  planAllWeeks,
  planWeek,
} from './mesocycleCalculator';
import { anchorForWeek, currentWeekFor, withCurrentWeek } from './weekAnchor';

const MAX_WEEKS = 52;

// `now` is threaded through every entry point rather than read from the global
// clock inside them, so the whole week-derivation path is testable — same shape
// as mesocycleCalculator.
export async function listMesocycles(
  db: SupabaseClient,
  userId: string,
  now: Date = new Date()
) {
  const rows = await mesocyclesRepository.findAllByUserId(db, userId);
  return (rows ?? []).map((row: any) => withCurrentWeek(row, now));
}

function readNumber(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`Expected a number, got "${value}"`);
  }
  return parsed;
}

// The database has CHECK constraints for all of this, but validating here turns
// a raw Postgres constraint violation into a message the client can show.
function validateConfig(config: MesocycleConfig) {
  const { total_weeks, start_pct, increment_pct, deload_enabled, deload_week, deload_pct } = config;

  if (!Number.isInteger(total_weeks) || total_weeks < 1 || total_weeks > MAX_WEEKS) {
    throw new ValidationError(`total_weeks must be an integer between 1 and ${MAX_WEEKS}`);
  }
  if (start_pct <= 0 || start_pct > 100) {
    throw new ValidationError('start_pct must be between 1 and 100');
  }
  if (increment_pct < 0 || increment_pct > 100) {
    throw new ValidationError('increment_pct must be between 0 and 100');
  }
  if (deload_pct <= 0 || deload_pct > 100) {
    throw new ValidationError('deload_pct must be between 1 and 100');
  }
  if (deload_enabled) {
    if (deload_week === null || !Number.isInteger(deload_week)) {
      throw new ValidationError('deload_week is required when deload is enabled');
    }
    if (deload_week < 1 || deload_week > total_weeks) {
      throw new ValidationError(`deload_week must be between 1 and ${total_weeks}`);
    }
  }
}

export async function createMesocycle(
  db: SupabaseClient,
  userId: string,
  input: any,
  now: Date = new Date()
) {
  // A mesocycle used to borrow the name of the routine it was bound to. It
  // covers every routine now (migration 010), so there is nothing left to
  // borrow and the user has to name the block themselves.
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  if (!name) {
    throw new ValidationError('name is required');
  }

  const deloadEnabled = Boolean(input.deload_enabled);
  const config: MesocycleConfig = {
    total_weeks: readNumber(input.total_weeks, 4),
    start_pct: readNumber(input.start_pct, 60),
    increment_pct: readNumber(input.increment_pct, 10),
    deload_enabled: deloadEnabled,
    deload_week: deloadEnabled ? readNumber(input.deload_week, 0) : null,
    deload_pct: readNumber(input.deload_pct, 50),
  };

  validateConfig(config);

  const created = await mesocyclesRepository.insert(db, {
    user_id: userId,
    name,
    ...config,
    // A brand-new block starts at week 1 in the calendar week it was created,
    // and advances by itself from the next Monday on. See weekAnchor.ts.
    ...anchorForWeek(1, now),
  });

  return withCurrentWeek(created, now);
}

/**
 * Collapses the user's routine memberships into one target per exercise.
 *
 * An exercise in both PUSH A and PUSH B is still ONE exercise with one 1RM, so
 * it gets one target; the routines it belongs to are merged into routine_ids so
 * the client can still show it under whichever routine it is displaying. The
 * first row's target_sets wins — two routines disagreeing about set count is a
 * routine-level decision the plan has no business arbitrating, and picking the
 * first keeps the result stable instead of depending on row order semantics.
 *
 * postgrest returns an embedded to-one relationship as an object, but as an
 * array when it cannot infer cardinality, so both shapes are accepted rather
 * than silently planning zero exercises.
 */
export function toPlannedInputs(rows: any[]): PlannedExerciseInput[] {
  const byExerciseId = new Map<string, PlannedExerciseInput>();

  for (const row of rows ?? []) {
    const exercise = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
    const existing = byExerciseId.get(row.exercise_id);

    if (existing) {
      if (row.routine_id && !existing.routine_ids!.includes(row.routine_id)) {
        existing.routine_ids!.push(row.routine_id);
      }
      continue;
    }

    byExerciseId.set(row.exercise_id, {
      exercise_id: row.exercise_id,
      name: exercise?.name ?? 'UNKNOWN',
      target_sets: row.target_sets ?? 3,
      one_rm: exercise?.one_rm == null ? null : Number(exercise.one_rm),
      routine_ids: row.routine_id ? [row.routine_id] : [],
    });
  }

  return [...byExerciseId.values()];
}

// The plan covers every exercise in AT LEAST ONE of the user's routines. An
// exercise in none of them deliberately gets no target: the app tells the user
// so (NOT_IN_ANY_ROUTINE) rather than inventing a prescription for something
// they never planned to train.
async function loadMesocycleAndExercises(db: SupabaseClient, userId: string, id: string) {
  const mesocycle = await mesocyclesRepository.findByIdAndUserId(db, id, userId);
  if (!mesocycle) {
    throw new NotFoundError('Mesocycle not found');
  }

  const rows = await routinesRepository.findExercisesByUserId(db, userId);
  return { mesocycle, exercises: toPlannedInputs(rows ?? []) };
}

/**
 * Targets for one week. Defaults to the mesocycle's current week so the client
 * can open the screen without knowing where the user left off.
 */
export async function getWeekPlan(
  db: SupabaseClient,
  userId: string,
  id: string,
  requestedWeek?: number,
  now: Date = new Date()
) {
  const { mesocycle, exercises } = await loadMesocycleAndExercises(db, userId, id);
  const week = requestedWeek ?? currentWeekFor(mesocycle, now);

  if (!Number.isInteger(week) || week < 1 || week > mesocycle.total_weeks) {
    throw new ValidationError(
      `Week ${week} is outside this mesocycle (1-${mesocycle.total_weeks})`
    );
  }

  return {
    mesocycle: withCurrentWeek(mesocycle, now),
    plan: planWeek(mesocycle as MesocycleConfig, exercises, week),
  };
}

/** Every week at once, for previewing the whole block. */
export async function getFullPlan(
  db: SupabaseClient,
  userId: string,
  id: string,
  now: Date = new Date()
) {
  const { mesocycle, exercises } = await loadMesocycleAndExercises(db, userId, id);
  return {
    mesocycle: withCurrentWeek(mesocycle, now),
    weeks: planAllWeeks(mesocycle as MesocycleConfig, exercises),
  };
}

/**
 * Sets the training week by hand -- absolute, not a step.
 *
 * This does not write a week number anywhere: it moves the ANCHOR to
 * (week, this Argentine Monday). The effect is that the block reads as `week`
 * for the rest of the current calendar week and then keeps advancing on its
 * own from next Monday, which is what makes onboarding a block already in
 * progress work without turning off auto-advance.
 */
export async function setWeek(
  db: SupabaseClient,
  userId: string,
  id: string,
  week: number,
  now: Date = new Date()
) {
  const mesocycle = await mesocyclesRepository.findByIdAndUserId(db, id, userId);
  if (!mesocycle) {
    throw new NotFoundError('Mesocycle not found');
  }

  if (!Number.isInteger(week) || week < 1 || week > mesocycle.total_weeks) {
    throw new ValidationError(
      `Week ${week} is outside this mesocycle (1-${mesocycle.total_weeks})`
    );
  }

  const updated = await mesocyclesRepository.updateByIdAndUserId(
    db,
    id,
    userId,
    anchorForWeek(week, now)
  );

  const row = updated?.[0];
  return row ? withCurrentWeek(row, now) : row;
}

export async function deleteMesocycle(db: SupabaseClient, userId: string, id: string) {
  const deleted = await mesocyclesRepository.deleteByIdAndUserId(db, id, userId);
  return { deleted: deleted?.length ?? 0 };
}
