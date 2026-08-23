import type { SupabaseClient } from '@supabase/supabase-js';
import * as exercisesRepository from '../repositories/exercisesRepository';
import { NotFoundError, ValidationError } from '../utils/errors';

export async function listExercises(db: SupabaseClient, userId: string) {
  return exercisesRepository.findAllByUserId(db, userId);
}

// The reference 1RM every mesocycle target weight is derived from. It gets its
// own path rather than riding along in syncExercises — see the note on
// exercisesRepository.updateOneRmByIdAndUserId.
export async function setOneRm(
  db: SupabaseClient,
  userId: string,
  id: string,
  oneRm: unknown
) {
  if (!id) {
    throw new ValidationError('exercise_id is required');
  }

  let value: number | null = null;
  if (oneRm !== null && oneRm !== undefined && oneRm !== '') {
    const parsed = Number(oneRm);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new ValidationError('one_rm must be a non-negative number');
    }
    // 0 means "no reference lift on record", same as null, so the planner has a
    // single case to handle instead of two.
    value = parsed === 0 ? null : parsed;
  }

  const updated = await exercisesRepository.updateOneRmByIdAndUserId(db, id, userId, value);
  if (!updated || updated.length === 0) {
    throw new NotFoundError('Exercise not found');
  }

  return updated[0];
}

// syncExercises is an upsert and can never remove rows, so deletion needs its
// own explicit path — otherwise a deleted exercise reappears on the next load.
export async function deleteExercise(db: SupabaseClient, userId: string, id: string) {
  const deleted = await exercisesRepository.deleteByIdAndUserId(db, id, userId);
  return { deleted: deleted?.length ?? 0 };
}

export async function syncExercises(db: SupabaseClient, userId: string, exercises: any[]) {
  // Map frontend data to Supabase schema
  const toUpsert = exercises.map((ex: any) => {
    const row: Record<string, unknown> = {
      user_id: userId,
      name: ex.name,
      muscle_group: ex.type || 'PULL', // Map frontend 'type' to muscle_group
      base_weight: 0, // Optional default
      sets: ex.sets,
      week: ex.week,
      weight: ex.weight,
    };

    // Only set `id` when the client sent a real UUID. Assigning `undefined`
    // here is not the same as omitting the key: postgrest-js normalises the
    // column set across rows and sends an explicit null, which fails the
    // NOT NULL primary key instead of falling back to gen_random_uuid().
    if (ex.id && ex.id.length === 36) {
      row.id = ex.id;
    }

    return row;
  });

  return exercisesRepository.upsertMany(db, toUpsert);
}
