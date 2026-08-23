import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../api/client';
import { setOneRm } from '../api/oneRm';

// A lift's id is the exercise UUID the server keyed its 1RM by. Earlier builds
// seeded this store with six invented lifts using ids '1'-'6', which are not
// exercise ids and cannot be saved back to anything — the persist migration
// below drops them.
const UUID_LENGTH = 36;
const isRealExerciseId = (id) => typeof id === 'string' && id.length === UUID_LENGTH;

export const useConfigStore = create(
  persist(
    (set, get) => ({
      // No seeded values: a 1RM the user never lifted is not data, and the
      // mesocycle planner derives target weights from these numbers.
      lifts1rm: [],
      isLoading: false,
      error: null,

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

      updateLift: (id, newValue) =>
        set((state) => ({
          lifts1rm: state.lifts1rm.map((lift) =>
            lift.id === id ? { ...lift, value: newValue } : lift
          ),
        })),

      // Re-reads the server's values, discarding local edits. It replaces the
      // old behaviour of restoring the invented defaults.
      resetLifts: async () => {
        await get().loadStats();
      },

      /**
       * Pushes edited 1RMs to the server. Without this the edits lived only in
       * AsyncStorage and the next loadStats() silently overwrote them — and the
       * backend, which calculates mesocycle target weights, never saw them.
       */
      saveConfig: async (newLifts) => {
        const previous = get().lifts1rm;
        set({ lifts1rm: newLifts, isLoading: true, error: null });

        try {
          const savable = newLifts.filter((lift) => {
            if (!isRealExerciseId(lift.id)) return false;
            const parsed = Number(lift.value);
            return Number.isFinite(parsed) && parsed >= 0;
          });

          for (const lift of savable) {
            await setOneRm(lift.id, Number(lift.value));
          }

          set({ isLoading: false });
        } catch (error) {
          // Roll back so the screen never shows a value the server rejected.
          set({ lifts1rm: previous, error: error.message, isLoading: false });
        }
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
      // Transient request state should not survive a restart.
      partialize: (state) => ({ lifts1rm: state.lifts1rm }),
    }
  )
);
