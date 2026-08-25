import type { SupabaseClient } from '@supabase/supabase-js';
import * as routinesRepository from '../repositories/routinesRepository';
import * as mesocyclesRepository from '../repositories/mesocyclesRepository';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

export async function listRoutines(db: SupabaseClient, userId: string) {
  return routinesRepository.findAllByUserId(db, userId);
}

export async function getRoutine(db: SupabaseClient, userId: string, id: string) {
  const routine = await routinesRepository.findByIdAndUserId(db, id, userId);
  if (!routine) {
    throw new NotFoundError('Routine not found');
  }

  const exercises = await routinesRepository.findExercisesByRoutineId(db, id);
  return { ...routine, exercises: exercises ?? [] };
}

export async function createRoutine(db: SupabaseClient, userId: string, input: any) {
  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  if (!name) {
    throw new ValidationError('name is required');
  }

  return routinesRepository.insert(db, {
    user_id: userId,
    name,
    description: input.description ?? null,
  });
}

/**
 * Deleting a routine used to cascade into its mesocycle, destroying the block's
 * configuration for good and orphaning the sessions that were planned from it.
 * The FK is ON DELETE RESTRICT now (migrations/006); this check exists so the
 * user gets a 409 explaining what blocks the delete instead of a raw constraint
 * violation surfacing as a 500.
 */
export async function deleteRoutine(db: SupabaseClient, userId: string, id: string) {
  const routine = await routinesRepository.findByIdAndUserId(db, id, userId);
  if (!routine) {
    throw new NotFoundError('Routine not found');
  }

  const mesocycles = await mesocyclesRepository.findByRoutineIdAndUserId(db, id, userId);
  if (mesocycles && mesocycles.length > 0) {
    const names = mesocycles.map((m: any) => m.name).join(', ');
    throw new ConflictError(
      `Routine is used by a training block (${names}). Delete the block first.`
    );
  }

  const deleted = await routinesRepository.deleteByIdAndUserId(db, id, userId);
  return { deleted: deleted?.length ?? 0 };
}

// A missing target still falls back to the routine's default. A value that
// parses but is zero or negative is rejected rather than written: a target of
// 0 sets is not a plan, and the numbers feed the mesocycle's weekly targets.
function requirePositiveTarget(value: unknown, field: string, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${field} must be a positive whole number`);
  }

  return parsed;
}

/**
 * Replaces the target sets/reps for the given exercises in a routine.
 * Exercises not mentioned are left untouched — removal goes through
 * removeExercise so it stays explicit, the same way exercise deletion does.
 */
export async function setRoutineExercises(
  db: SupabaseClient,
  userId: string,
  routineId: string,
  exercises: any[]
) {
  const routine = await routinesRepository.findByIdAndUserId(db, routineId, userId);
  if (!routine) {
    throw new NotFoundError('Routine not found');
  }

  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new ValidationError('exercises array is required');
  }

  const rows = exercises.map((ex: any) => {
    if (!ex?.exercise_id) {
      throw new ValidationError('each exercise needs an exercise_id');
    }

    return {
      routine_id: routineId,
      exercise_id: ex.exercise_id,
      target_sets: requirePositiveTarget(ex.target_sets, 'target_sets', 3),
      // target_reps stays on the row as the routine's baseline. A mesocycle
      // overrides it per week from the %1RM table, but a routine used without
      // a mesocycle still needs a number here.
      target_reps: requirePositiveTarget(ex.target_reps, 'target_reps', 8),
    };
  });

  return routinesRepository.upsertRoutineExercises(db, rows);
}

export async function removeExercise(
  db: SupabaseClient,
  userId: string,
  routineId: string,
  exerciseId: string
) {
  const routine = await routinesRepository.findByIdAndUserId(db, routineId, userId);
  if (!routine) {
    throw new NotFoundError('Routine not found');
  }

  const deleted = await routinesRepository.deleteRoutineExercise(db, routineId, exerciseId);
  return { deleted: deleted?.length ?? 0 };
}
