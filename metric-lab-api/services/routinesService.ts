import type { SupabaseClient } from '@supabase/supabase-js';
import * as routinesRepository from '../repositories/routinesRepository';
import { NotFoundError, ValidationError } from '../utils/errors';

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

export async function deleteRoutine(db: SupabaseClient, userId: string, id: string) {
  const deleted = await routinesRepository.deleteByIdAndUserId(db, id, userId);
  return { deleted: deleted?.length ?? 0 };
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
      target_sets: Number(ex.target_sets) || 3,
      // target_reps stays on the row as the routine's baseline. A mesocycle
      // overrides it per week from the %1RM table, but a routine used without
      // a mesocycle still needs a number here.
      target_reps: Number(ex.target_reps) || 8,
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
