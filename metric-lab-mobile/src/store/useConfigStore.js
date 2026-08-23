import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../api/client';
import * as oneRmApi from '../api/oneRm';
import { useWorkoutStore } from './useWorkoutStore';

// A lift's id is the exercise UUID the server keyed its 1RM by. Earlier builds
// seeded this store with six invented lifts using ids '1'-'6', which are not
// exercise ids and cannot be saved back to anything — the persist migration
// below drops them.
const UUID_LENGTH = 36;
const isRealExerciseId = (id) => typeof id === 'string' && id.length === UUID_LENGTH;

// Backs the Config screen's exercise catalog: reads come from /data/stats
// (id, name, type, oneRm/oneRmWeight/oneRmReps/isManual, historyValue), but
// exercise CRUD itself is delegated to useWorkoutStore — that store is the
// single source of truth for the exercises array and already knows how to
// sync creates/renames/deletes to the server. This store mirrors the result
// of those calls into its own cached list so the catalog UI updates without
// waiting on a full /data/stats round trip.
export const useConfigStore = create(
  persist(
    (set, get) => ({
      // No seeded values: a 1RM the user never lifted is not data, and the
      // mesocycle planner derives target weights from these numbers.
      lifts1rm: [],
      isLoading: false,
      error: null,

      // Per-exercise UI state, not persisted:
      //   estimatingIds[id]            — a weight x reps submission is in flight
      //   lowConfidenceByExerciseId[id] — the last estimate's lowConfidence flag,
      //     kept around so the warning survives the re-render right after a
      //     submit (Epley overestimates past RELIABLE_REP_LIMIT reps; the API
      //     still accepts the value, it just flags it instead of rejecting it)
      isCreatingExercise: false,
      estimatingIds: {},
      lowConfidenceByExerciseId: {},

      loadStats: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await apiRequest('/data/stats');
          set({ lifts1rm: data.stats ?? [], isLoading: false });
        } catch (error) {
          // Keep whatever is already on screen rather than blanking it, but
          // surface the failure so the user can retry instead of staring at
          // stale numbers with no explanation.
          set({ error: error.message, isLoading: false });
        }
      },

      /**
       * Estimates a 1RM from a set the user actually did (weight x reps) and
       * merges the server's answer straight into the cached row instead of
       * reloading the whole list — the fields the response can change
       * (oneRm/oneRmWeight/oneRmReps/isManual) are exactly the fields this
       * endpoint determines. historyValue/recentValue are left untouched:
       * this never overwrites what logged history implies, only the
       * reference the mesocycle planner reads from.
       *
       * A manually-entered 1RM always wins over history — that is enforced
       * server-side (statsService prefers `reference` over `bestHistory`),
       * this just reflects the same value back immediately.
       */
      submitOneRmEstimate: async (exerciseId, weight, reps) => {
        set((state) => ({
          estimatingIds: { ...state.estimatingIds, [exerciseId]: true },
          error: null,
        }));

        try {
          const { exercise, lowConfidence } = await oneRmApi.estimateOneRm(
            exerciseId,
            weight,
            reps
          );

          set((state) => ({
            lifts1rm: state.lifts1rm.map((lift) =>
              lift.id === exerciseId
                ? {
                    ...lift,
                    value: exercise.one_rm != null ? String(exercise.one_rm) : lift.value,
                    oneRm: exercise.one_rm != null ? Number(exercise.one_rm) : null,
                    oneRmWeight:
                      exercise.one_rm_weight != null ? Number(exercise.one_rm_weight) : null,
                    oneRmReps: exercise.one_rm_reps != null ? Number(exercise.one_rm_reps) : null,
                    isManual: true,
                  }
                : lift
            ),
            lowConfidenceByExerciseId: {
              ...state.lowConfidenceByExerciseId,
              [exerciseId]: lowConfidence,
            },
          }));

          return { success: true, lowConfidence };
        } catch (error) {
          set({ error: error.message });
          return { success: false, error: error.message };
        } finally {
          set((state) => ({
            estimatingIds: { ...state.estimatingIds, [exerciseId]: false },
          }));
        }
      },

      /**
       * Creates a catalog exercise through useWorkoutStore (the CRUD source
       * of truth, which awaits its own sync before returning) and appends it
       * here in the same shape /data/stats would give a brand new exercise —
       * no reference 1RM, no history — so it shows up immediately.
       */
      createExercise: async (name, type) => {
        const trimmed = String(name ?? '').trim();
        if (!trimmed) return { success: false, error: 'VALIDATION_REQUIRED' };

        set({ isCreatingExercise: true, error: null });
        try {
          const created = await useWorkoutStore
            .getState()
            .addExercise({ name: trimmed, week: 'WK 1/4', weight: '0.0', sets: '0x0' }, type);

          set((state) => ({
            lifts1rm: [
              ...state.lifts1rm,
              {
                id: created.id,
                name: created.name,
                type: created.type,
                value: '',
                prev: '',
                oneRm: null,
                oneRmWeight: null,
                oneRmReps: null,
                isManual: false,
                historyValue: null,
                recentValue: null,
              },
            ],
          }));

          return { success: true, exercise: created };
        } catch (error) {
          set({ error: error.message });
          return { success: false, error: error.message };
        } finally {
          set({ isCreatingExercise: false });
        }
      },

      /**
       * Renames a catalog exercise. useWorkoutStore.updateExercise already
       * syncs the new name to the server; this only mirrors it into the
       * cached stats list so the catalog reflects it without a reload.
       */
      renameExercise: (id, name) => {
        const trimmed = String(name ?? '').trim();
        if (!trimmed) return { success: false, error: 'VALIDATION_REQUIRED' };

        useWorkoutStore.getState().updateExercise(id, { name: trimmed });
        set((state) => ({
          lifts1rm: state.lifts1rm.map((lift) =>
            lift.id === id ? { ...lift, name: trimmed } : lift
          ),
        }));
        return { success: true };
      },

      /**
       * Deletes a catalog exercise. Optimistic, and rides on
       * useWorkoutStore.removeExercise's own rollback rather than duplicating
       * it: once that call settles, if the exercise is still present in
       * useWorkoutStore.exercises the DELETE failed and got rolled back
       * there, so this restores the row here too instead of the two stores
       * disagreeing about whether it exists.
       */
      deleteExercise: async (id) => {
        const previous = get().lifts1rm;
        const index = previous.findIndex((lift) => lift.id === id);
        if (index === -1) return { success: true };

        set({ lifts1rm: previous.filter((lift) => lift.id !== id) });

        await useWorkoutStore.getState().removeExercise(id);

        const stillInCatalog = useWorkoutStore.getState().exercises.some((ex) => ex.id === id);

        if (stillInCatalog) {
          set((state) => {
            const restored = [...state.lifts1rm];
            restored.splice(index, 0, previous[index]);
            return { lifts1rm: restored };
          });
          return { success: false };
        }

        return { success: true };
      },
    }),
    {
      name: 'config-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // v1 removes the invented starter lifts that shipped in v0. They are
      // already persisted on existing installs, so changing the initial state
      // alone would not have cleared them.
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0 && persistedState) {
          return {
            ...persistedState,
            lifts1rm: (persistedState.lifts1rm ?? []).filter((lift) =>
              isRealExerciseId(lift?.id)
            ),
          };
        }
        return persistedState;
      },
      // Transient request/UI state should not survive a restart.
      partialize: (state) => ({ lifts1rm: state.lifts1rm }),
    }
  )
);
