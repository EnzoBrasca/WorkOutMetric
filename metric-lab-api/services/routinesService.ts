import type { SupabaseClient } from '@supabase/supabase-js';
import * as routinesRepository from '../repositories/routinesRepository';
import { NotFoundError, ValidationError } from '../utils/errors';

/**
 * The membership count comes back as a nested aggregate
 * (`routine_exercises: [{ count: n }]`). Flatten it to a plain
 * `exercise_count` so clients never have to know that shape, and default it
 * to 0 — an empty routine has zero exercises, not an unknown number.
 */
export async function listRoutines(db: SupabaseClient, userId: string) {
  const routines = await routinesRepository.findAllByUserId(db, userId);

  return (routines ?? []).map((routine: any) => {
    const { routine_exercises, ...rest } = routine;
    return { ...rest, exercise_count: routine_exercises?.[0]?.count ?? 0 };
  });
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

  const type = typeof input?.type === 'string' ? input.type.trim() : '';
  const description = typeof input?.description === 'string' ? input.description.trim() : '';

  return routinesRepository.insert(db, {
    user_id: userId,
    name,
    // Empty means "untagged", and NULL is what the column uses for that —
    // storing '' would make an untagged routine sort and compare differently
    // from one created before migration 009 added the column.
    type: type || null,
    description: description || null,
  });
}

/**
 * Partial update: only the fields actually present in the payload are written.
 * Renaming a routine must not blank its type, and retagging must not blank its
 * description, so an omitted field is left alone while an explicitly empty one
 * clears the column.
 */
export async function updateRoutine(
  db: SupabaseClient,
  userId: string,
  id: string,
  input: any
) {
  const routine = await routinesRepository.findByIdAndUserId(db, id, userId);
  if (!routine) {
    throw new NotFoundError('Routine not found');
  }

  const patch: Record<string, unknown> = {};

  if (input?.name !== undefined) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name) {
      throw new ValidationError('name cannot be empty');
    }
    patch.name = name;
  }

  if (input?.type !== undefined) {
    const type = typeof input.type === 'string' ? input.type.trim() : '';
    patch.type = type || null;
  }

  if (input?.description !== undefined) {
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    patch.description = description || null;
  }

  if (Object.keys(patch).length === 0) {
    throw new ValidationError('nothing to update');
  }

  return routinesRepository.updateByIdAndUserId(db, id, userId, patch);
}

/**
 * Deleting a routine used to be blocked by a 409 when a mesocycle pointed at
 * it: the FK was ON DELETE RESTRICT (migrations/006) because a cascade would
 * have destroyed the block's whole configuration.
 *
 * Mesocycles are user-scoped now — migration 010 dropped mesocycles.routine_id,
 * and the foreign key with it — so a routine delete has no block to destroy.
 * The routine's memberships go (routine_exercises cascades), the catalog
 * exercises and the logged history stay, and any mesocycle simply plans one
 * routine fewer from the next request on.
 */
export async function deleteRoutine(db: SupabaseClient, userId: string, id: string) {
  const routine = await routinesRepository.findByIdAndUserId(db, id, userId);
  if (!routine) {
    throw new NotFoundError('Routine not found');
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
