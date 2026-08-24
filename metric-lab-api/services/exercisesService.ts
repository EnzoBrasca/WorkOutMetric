import type { SupabaseClient } from '@supabase/supabase-js';
import * as exercisesRepository from '../repositories/exercisesRepository';
import { NotFoundError, ValidationError } from '../utils/errors';
import { estimateOneRm } from './oneRmCalculator';

export async function listExercises(db: SupabaseClient, userId: string) {
  return exercisesRepository.findAllByUserId(db, userId);
}

/**
 * Sets the reference 1RM every mesocycle target weight derives from.
 *
 * Accepts either shape:
 *   { one_rm: 120 }              — the value directly
 *   { weight: 100, reps: 5 }     — a set to estimate it from (Epley)
 *
 * The weight/reps form also records the source set, which marks the value as
 * user-owned: logged history is reported alongside it but never replaces it.
 *
 * Has its own path rather than riding along in syncExercises — see the note on
 * exercisesRepository.updateOneRmByIdAndUserId.
 */
export async function setOneRm(
  db: SupabaseClient,
  userId: string,
  id: string,
  input: { one_rm?: unknown; weight?: unknown; reps?: unknown }
) {
  if (!id) {
    throw new ValidationError('exercise_id is required');
  }

  const { one_rm, weight, reps } = input ?? {};
  const hasSet = weight !== undefined && weight !== null && weight !== ''
    && reps !== undefined && reps !== null && reps !== '';

  let value: number | null = null;
  let sourceWeight: number | null = null;
  let sourceReps: number | null = null;
  let lowConfidence = false;

  if (hasSet) {
    const parsedWeight = Number(weight);
    const parsedReps = Number(reps);

    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      throw new ValidationError('weight must be a positive number');
    }
    if (!Number.isInteger(parsedReps) || parsedReps <= 0) {
      throw new ValidationError('reps must be a positive whole number');
    }

    const estimate = estimateOneRm(parsedWeight, parsedReps);
    value = estimate.oneRm;
    sourceWeight = parsedWeight;
    sourceReps = parsedReps;
    lowConfidence = estimate.lowConfidence;
  } else if (one_rm !== null && one_rm !== undefined && one_rm !== '') {
    const parsed = Number(one_rm);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new ValidationError('one_rm must be a non-negative number');
    }
    // 0 means "no reference lift on record", same as null, so the planner has a
    // single case to handle instead of two.
    value = parsed === 0 ? null : parsed;
  }

  // Clearing the 1RM clears its provenance too, so a stale source set can never
  // outlive the number it produced.
  const updated = await exercisesRepository.updateOneRmByIdAndUserId(
    db,
    id,
    userId,
    value,
    value === null ? null : sourceWeight,
    value === null ? null : sourceReps
  );

  if (!updated || updated.length === 0) {
    throw new NotFoundError('Exercise not found');
  }

  return { exercise: updated[0], lowConfidence };
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
      // Maps the frontend 'type' to muscle_group. Null is meaningful: an
      // exercise created in the config catalog has no push/pull tag until it is
      // added to a routine in the training screen, and defaulting it to 'PULL'
      // showed a tag the user never chose. Clients that always send a type —
      // including the Android build already in users' hands — are unaffected.
      muscle_group: ex.type || null,
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
