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

const MAX_WEEKS = 52;

export async function listMesocycles(db: SupabaseClient, userId: string) {
  return mesocyclesRepository.findAllByUserId(db, userId);
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

export async function createMesocycle(db: SupabaseClient, userId: string, input: any) {
  if (!input?.routine_id) {
    throw new ValidationError('routine_id is required');
  }

  // Confirm the routine is the caller's before binding a mesocycle to it. RLS
  // would block a foreign routine anyway, but this returns a clear 404 instead
  // of an opaque constraint error.
  const routine = await routinesRepository.findByIdAndUserId(db, input.routine_id, userId);
  if (!routine) {
    throw new NotFoundError('Routine not found');
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

  return mesocyclesRepository.insert(db, {
    user_id: userId,
    routine_id: input.routine_id,
    name: input.name || routine.name,
    ...config,
    current_week: 1,
  });
}

// routine_exercises embeds the exercise row; postgrest returns it as an object
// for a to-one relationship but as an array when it cannot infer cardinality,
// so accept both rather than silently planning zero exercises.
function toPlannedInput(row: any): PlannedExerciseInput {
  const exercise = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;

  return {
    exercise_id: row.exercise_id,
    name: exercise?.name ?? 'UNKNOWN',
    target_sets: row.target_sets ?? 3,
    one_rm: exercise?.one_rm == null ? null : Number(exercise.one_rm),
  };
}

async function loadMesocycleAndExercises(db: SupabaseClient, userId: string, id: string) {
  const mesocycle = await mesocyclesRepository.findByIdAndUserId(db, id, userId);
  if (!mesocycle) {
    throw new NotFoundError('Mesocycle not found');
  }

  const rows = await routinesRepository.findExercisesByRoutineId(db, mesocycle.routine_id);
  return { mesocycle, exercises: (rows ?? []).map(toPlannedInput) };
}

/**
 * Targets for one week. Defaults to the mesocycle's current week so the client
 * can open the screen without knowing where the user left off.
 */
export async function getWeekPlan(
  db: SupabaseClient,
  userId: string,
  id: string,
  requestedWeek?: number
) {
  const { mesocycle, exercises } = await loadMesocycleAndExercises(db, userId, id);
  const week = requestedWeek ?? mesocycle.current_week;

  if (!Number.isInteger(week) || week < 1 || week > mesocycle.total_weeks) {
    throw new ValidationError(
      `Week ${week} is outside this mesocycle (1-${mesocycle.total_weeks})`
    );
  }

  return { mesocycle, plan: planWeek(mesocycle as MesocycleConfig, exercises, week) };
}

/** Every week at once, for previewing the whole block. */
export async function getFullPlan(db: SupabaseClient, userId: string, id: string) {
  const { mesocycle, exercises } = await loadMesocycleAndExercises(db, userId, id);
  return { mesocycle, weeks: planAllWeeks(mesocycle as MesocycleConfig, exercises) };
}

export async function setCurrentWeek(
  db: SupabaseClient,
  userId: string,
  id: string,
  week: number
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

  const updated = await mesocyclesRepository.updateByIdAndUserId(db, id, userId, {
    current_week: week,
  });

  return updated?.[0];
}

export async function deleteMesocycle(db: SupabaseClient, userId: string, id: string) {
  const deleted = await mesocyclesRepository.deleteByIdAndUserId(db, id, userId);
  return { deleted: deleted?.length ?? 0 };
}
