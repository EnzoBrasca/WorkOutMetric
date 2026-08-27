import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local-only override for an exercise's sets/reps target within a mesocycle
 * week. Never synced to the backend: routine_exercises.target_sets/reps stay
 * the source of truth server-side, and the mesocycle plan is recalculated
 * from them on every request. This is purely a client-side "for right now"
 * adjustment layered on top of whatever the plan (or, without an active
 * mesocycle, the routine membership) says the target should be.
 *
 * Scoped to (mesocycleId, week, exerciseId): the same exercise showing up
 * again later in the same week -- e.g. a "push" routine visited twice --
 * keeps the adjustment, but it does NOT carry over once the mesocycle
 * advances to the next week. At that point the calculated target is shown
 * again.
 *
 * Storage keeps only ONE week's worth of overrides per mesocycle
 * (`overridesByMesocycle[mesocycleId] = { week, exercises }`), so writing an
 * override for a new week drops whatever the previous week held rather than
 * accumulating entries in AsyncStorage for the life of the mesocycle.
 */

// Positive-integer validation -- the same rule the routine-exercise target
// fields already enforce (routine_exercises' sets/reps columns are `> 0` in
// the DB), reused here so an override can never desync from what the server
// would accept if it were ever sent up.
export function validateOverrideValue(value) {
  const text = String(value ?? '').trim();
  if (!text) return 'VALIDATION_REQUIRED';
  const parsed = Number(text);
  if (!Number.isInteger(parsed)) return 'VALIDATION_INTEGER';
  if (parsed <= 0) return 'VALIDATION_POSITIVE';
  return null;
}

// Pure lookup so the merge logic in useTrainScreen and this store's own
// getOverride share one rule for "is this override still current". The
// bucket only ever holds one week per mesocycle, so a bucket left over from
// a week that has since advanced (or been changed manually) is simply not
// returned -- it reads as no override rather than a stale one.
export function resolveOverride(overridesByMesocycle, mesocycleId, week, exerciseId) {
  if (!mesocycleId || !week) return undefined;
  const bucket = overridesByMesocycle[mesocycleId];
  if (!bucket || bucket.week !== week) return undefined;
  return bucket.exercises[exerciseId];
}

export const useExerciseOverrideStore = create(
  persist(
    (set, get) => ({
      // { [mesocycleId]: { week, exercises: { [exerciseId]: { targetSets, targetReps } } } }
      overridesByMesocycle: {},

      getOverride: (mesocycleId, week, exerciseId) =>
        resolveOverride(get().overridesByMesocycle, mesocycleId, week, exerciseId),

      // Validates and stores an override. Any bucket left from a previous
      // week for this mesocycle is dropped in the same write -- see the
      // module comment on why storage only ever keeps the current week.
      setOverride: (mesocycleId, week, exerciseId, targetSets, targetReps) => {
        const setsError = validateOverrideValue(targetSets);
        if (setsError) return { success: false, error: setsError, field: 'targetSets' };
        const repsError = validateOverrideValue(targetReps);
        if (repsError) return { success: false, error: repsError, field: 'targetReps' };

        set((state) => {
          const existing = state.overridesByMesocycle[mesocycleId];
          const exercises = existing && existing.week === week ? existing.exercises : {};
          return {
            overridesByMesocycle: {
              ...state.overridesByMesocycle,
              [mesocycleId]: {
                week,
                exercises: {
                  ...exercises,
                  [exerciseId]: {
                    targetSets: Number(targetSets),
                    targetReps: Number(targetReps),
                  },
                },
              },
            },
          };
        });

        return { success: true };
      },

      // Reverts a single exercise back to the calculated/suggested target.
      clearOverride: (mesocycleId, week, exerciseId) => {
        set((state) => {
          const existing = state.overridesByMesocycle[mesocycleId];
          if (!existing || existing.week !== week || !(exerciseId in existing.exercises)) {
            return {};
          }
          const { [exerciseId]: _removed, ...rest } = existing.exercises;
          return {
            overridesByMesocycle: {
              ...state.overridesByMesocycle,
              [mesocycleId]: { week, exercises: rest },
            },
          };
        });
      },
    }),
    {
      name: 'exercise-override-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
