import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as exercisesRepository from '../repositories/exercisesRepository';
import { NotFoundError, ValidationError } from '../utils/errors';
import { estimateOneRm } from './oneRmCalculator';

export async function listExercises(db: SupabaseClient, userId: string) {
  return exercisesRepository.findAllByUserId(db, userId);
}

// Equipment a load can be split across — held one per hand, or loaded per
// side. Everything else is a single implement carrying the whole weight.
const SPLITTABLE_EQUIPMENT = new Set(['DUMBBELL', 'CABLE']);

/** An untagged exercise stays untagged: null reads as a plain total weight. */
export function normalizeEquipment(equipment: unknown): string | null {
  if (typeof equipment !== 'string') return null;
  const trimmed = equipment.trim().toUpperCase();
  return trimmed === '' ? null : trimmed;
}

/**
 * The unit count to store. The column's CHECK accepts only 1 or 2, and
 * equipment that cannot be split is pinned to 1 rather than sent to be
 * rejected — a barbell tagged as 2 is a value the UI never offered.
 */
export function normalizeEquipmentUnits(equipment: unknown, units: unknown): number {
  const tag = normalizeEquipment(equipment);
  if (tag === null || !SPLITTABLE_EQUIPMENT.has(tag)) return 1;
  return Number(units) === 2 ? 2 : 1;
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
// The removal is a soft delete: see exercisesRepository.softDeleteByIdAndUserId.
export async function deleteExercise(db: SupabaseClient, userId: string, id: string) {
  const deleted = await exercisesRepository.softDeleteByIdAndUserId(db, id, userId);
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
      // base_weight is deliberately absent. It used to be pinned to 0 on every
      // sync, silently overwriting whatever the row held. Nothing in the API or
      // the app ever reads the column, so the write was pure destruction.
      sets: ex.sets,
      week: ex.week,
      weight: ex.weight,
      // Always present, never conditional: postgrest-js builds the upsert's
      // column set from the union of the rows' keys, so a row omitting these
      // while a sibling carried them would have an explicit NULL written over
      // its equipment — the same failure mode documented for one_rm and id.
      equipment: normalizeEquipment(ex.equipment),
      equipment_units: normalizeEquipmentUnits(ex.equipment, ex.equipment_units),
    };

    // Every row carries an id, even a brand-new exercise. postgrest-js builds
    // the upsert's column set from the union of the rows' keys, so a row that
    // omitted `id` while a sibling carried one got an explicit null written
    // into it — failing the NOT NULL primary key and taking the whole batch
    // down. Minting the UUID here keeps the column set identical across rows.
    row.id = ex.id && ex.id.length === 36 ? ex.id : randomUUID();

    return row;
  });

  return exercisesRepository.upsertMany(db, toUpsert);
}
