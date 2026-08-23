import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as mesocyclesApi from '../api/mesocycles';
import * as routinesApi from '../api/routines';
import * as oneRmApi from '../api/oneRm';

export const useMesocycleStore = create(
  persist(
    (set, get) => ({
      mesocycles: [],
      activeMesocycleId: null,
      routines: [],

      // Calculated targets for the active mesocycle's current week. Never
      // stored on the backend, so this is always just a cache of the last
      // successful /mesocycles/plan response.
      plan: null,

      isLoading: false,
      isSavingRoutine: false,
      isPlanLoading: false,
      isSettingOneRm: false,
      error: null,

      loadMesocycles: async () => {
        set({ isLoading: true, error: null });
        try {
          const { mesocycles } = await mesocyclesApi.listMesocycles();
          set({ mesocycles });
        } catch (error) {
          console.error('Failed to load mesocycles:', error);
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      loadRoutines: async () => {
        try {
          const { routines } = await routinesApi.listRoutines();
          set({ routines });
        } catch (error) {
          // Surfaced, not just logged: with no routines the mesocycle form has
          // nothing to attach to, and a silent failure looks identical to a
          // user who genuinely has none.
          console.error('Failed to load routines:', error);
          set({ error: error.message });
        }
      },

      createMesocycle: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const { mesocycle } = await mesocyclesApi.createMesocycle(payload);
          set((state) => ({ mesocycles: [...state.mesocycles, mesocycle] }));
          await get().selectActiveMesocycle(mesocycle.id);
          return { success: true, mesocycle };
        } catch (error) {
          console.error('Failed to create mesocycle:', error);
          set({ error: error.message });
          return { success: false, error: error.message };
        } finally {
          set({ isLoading: false });
        }
      },

      // Passing null goes back to the "no active mesocycle" state, which is
      // what lets the rest of the app fall back to its pre-mesocycle behavior.
      selectActiveMesocycle: async (id) => {
        set({ activeMesocycleId: id, plan: null });
        if (id) {
          await get().refreshPlan();
        }
      },

      refreshPlan: async () => {
        const activeId = get().activeMesocycleId;
        if (!activeId) {
          set({ plan: null });
          return;
        }

        set({ isPlanLoading: true, error: null });
        try {
          const { plan } = await mesocyclesApi.getMesocyclePlan(activeId);
          set({ plan });
        } catch (error) {
          console.error('Failed to load mesocycle plan:', error);
          set({ error: error.message });
        } finally {
          set({ isPlanLoading: false });
        }
      },

      setCurrentWeek: async (week) => {
        const activeId = get().activeMesocycleId;
        if (!activeId) return;

        const previousMesocycles = get().mesocycles;
        const previousPlan = get().plan;

        // Optimistic: bump the local current_week so the selector reacts
        // immediately, but keep the last plan on screen until the new one
        // arrives rather than blanking targets during the round trip.
        set((state) => ({
          mesocycles: state.mesocycles.map((m) =>
            m.id === activeId ? { ...m, current_week: week } : m
          ),
        }));

        try {
          const { mesocycle } = await mesocyclesApi.setMesocycleWeek(activeId, week);
          set((state) => ({
            mesocycles: state.mesocycles.map((m) => (m.id === activeId ? mesocycle : m)),
          }));
          await get().refreshPlan();
        } catch (error) {
          console.error('Failed to set current week:', error);
          // Put it back rather than leaving the UI showing a week the server rejected.
          set({ mesocycles: previousMesocycles, plan: previousPlan });
        }
      },

      deleteMesocycle: async (id) => {
        const previousMesocycles = get().mesocycles;
        const previousPlan = get().plan;
        const wasActive = get().activeMesocycleId === id;

        set((state) => ({
          mesocycles: state.mesocycles.filter((m) => m.id !== id),
          ...(wasActive ? { activeMesocycleId: null, plan: null } : {}),
        }));

        try {
          await mesocyclesApi.deleteMesocycle(id);
        } catch (error) {
          console.error('Failed to delete mesocycle:', error);
          set({
            mesocycles: previousMesocycles,
            ...(wasActive ? { activeMesocycleId: id, plan: previousPlan } : {}),
          });
        }
      },

      // Exercises the backend has backfilled from set history already have a
      // 1RM; a newly added exercise doesn't, and the plan comes back with
      // targetWeight: null + needsOneRm: true for it. This is how the client
      // fills that gap.
      setOneRm: async (exerciseId, oneRm) => {
        set({ isSettingOneRm: true, error: null });
        try {
          await oneRmApi.setOneRm(exerciseId, oneRm);
          await get().refreshPlan();
          return { success: true };
        } catch (error) {
          console.error('Failed to set 1RM:', error);
          set({ error: error.message });
          return { success: false, error: error.message };
        } finally {
          set({ isSettingOneRm: false });
        }
      },

      /**
       * Puts an exercise into a routine, which is what makes it eligible for
       * mesocycle targets at all — the plan is built from a routine's
       * membership, so an exercise outside every routine silently keeps showing
       * its old free-text target forever.
       */
      setExerciseRoutine: async (routineId, exerciseId, targetSets, targetReps) => {
        if (!routineId || !exerciseId) return { success: false };

        set({ isSavingRoutine: true, error: null });
        try {
          await routinesApi.setRoutineExercises(routineId, [
            {
              exercise_id: exerciseId,
              target_sets: targetSets,
              target_reps: targetReps,
            },
          ]);

          // Only meaningful when a mesocycle is running; refreshPlan is a no-op
          // otherwise, and this is what makes the new exercise show a
          // calculated target straight away instead of after a reload.
          if (get().activeMesocycleId) {
            await get().refreshPlan();
          }

          return { success: true };
        } catch (error) {
          console.error('Failed to set exercise routine:', error);
          set({ error: error.message });
          return { success: false, error: error.message };
        } finally {
          set({ isSavingRoutine: false });
        }
      },
    }),
    {
      name: 'mesocycle-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
