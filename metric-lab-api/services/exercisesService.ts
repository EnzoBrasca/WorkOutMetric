import type { SupabaseClient } from '@supabase/supabase-js';
import * as exercisesRepository from '../repositories/exercisesRepository';

export async function listExercises(db: SupabaseClient, userId: string) {
  return exercisesRepository.findAllByUserId(db, userId);
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
