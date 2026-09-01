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

      // The Train tab's selected routine, with its exercise membership
      // (routine_exercises, each carrying the nested `exercises` row). Null
      // when nothing is selected yet — see loadRoutineDetail.
      activeRoutineDetail: null,

      // Calculated targets for the active mesocycle's current week. Never
      // stored on the backend, so this is always just a cache of the last
      // successful /mesocycles?resource=plan response.
      plan: null,

      isLoading: false,
      isSavingRoutine: false,
      isPlanLoading: false,
      isSettingOneRm: false,
      isLoadingRoutineDetail: false,
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
          // Surfaced, not just logged: with no routines the Train tab has
          // nothing to show, and a silent failure looks identical to a user
          // who genuinely has none.
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

        // Sets the week outright — the backend advances it on its own every
        // Monday, and this is the manual override for a block started outside
        // the app. current_week is a DERIVED field on the row (the server holds
        // an anchor, not a counter), so the optimistic value below is a
        // prediction of what the server will compute, replaced by its answer.
        //
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

      /**
       * Loads a routine's exercise membership by id and caches it as the Train
       * screen's active routine.
       *
       * Routines used to be resolved by matching the tab string against
       * routine.name ('push' -> the routine literally named "PUSH"), which
       * broke the moment routines became user-created and arbitrarily named.
       * The tab IS the routine id now, so this is a direct lookup. An id that
       * is not in the list (deleted elsewhere, or nothing selected yet) clears
       * the cache instead of erroring.
       */
      loadRoutineDetail: async (routineId) => {
        const match = routineId
          ? get().routines.find((routine) => routine.id === routineId)
          : null;

        if (!match) {
          set({ activeRoutineDetail: null });
          return null;
        }

        set({ isLoadingRoutineDetail: true, error: null });
        try {
          const { routine } = await routinesApi.getRoutine(match.id);
          set({ activeRoutineDetail: routine });
          return routine;
        } catch (error) {
          console.error('Failed to load routine detail:', error);
          set({ error: error.message, activeRoutineDetail: null });
          return null;
        } finally {
          set({ isLoadingRoutineDetail: false });
        }
      },

      // Reads a routine's detail WITHOUT touching activeRoutineDetail, so the
      // routines screen can prefill its exercise picker without stealing the
      // routine the Train tab is showing.
      fetchRoutineDetail: async (routineId) => {
        if (!routineId) return null;
        try {
          const { routine } = await routinesApi.getRoutine(routineId);
          return routine;
        } catch (error) {
          console.error('Failed to fetch routine detail:', error);
          set({ error: error.message });
          return null;
        }
      },

      /**
       * Creates a routine from the routines screen: name, freeform type tag,
       * optional description, plus the exercises picked in the same form —
       * sent as ONE batched membership request, since setRoutineExercises
       * accepts an array.
       *
       * If the routine is created but the membership request fails, the
       * routine still exists server-side: it is kept in the list (with a count
       * of 0) and the failure is reported, rather than hiding a row the user
       * would then create a duplicate of.
       */
      createRoutine: async ({
        name,
        type,
        description,
        exerciseIds = [],
        exerciseTargets = {},
      } = {}) => {
        set({ isSavingRoutine: true, error: null });
        try {
          const payload = { name };
          if (type !== undefined) payload.type = type;
          if (description !== undefined) payload.description = description;

          const { routine } = await routinesApi.createRoutine(payload);
          set((state) => ({
            routines: [...state.routines, { ...routine, exercise_count: 0 }],
          }));

          if (exerciseIds.length > 0) {
            await routinesApi.setRoutineExercises(
              routine.id,
              exerciseIds.map((exerciseId) => ({
                exercise_id: exerciseId,
                // Same shape as syncRoutineExercises: omitted when unknown so
                // the API's own default applies.
                ...(exerciseTargets[exerciseId]?.sets
                  ? { target_sets: exerciseTargets[exerciseId].sets }
                  : {}),
                ...(exerciseTargets[exerciseId]?.reps
                  ? { target_reps: exerciseTargets[exerciseId].reps }
                  : {}),
              }))
            );
            set((state) => ({
              routines: state.routines.map((r) =>
                r.id === routine.id ? { ...r, exercise_count: exerciseIds.length } : r
              ),
            }));
          }

          return { success: true, routine };
        } catch (error) {
          console.error('Failed to create routine:', error);
          set({ error: error.message });
          return { success: false, error: error.message };
        } finally {
          set({ isSavingRoutine: false });
        }
      },

      // Rename / retag / re-describe. Optimistic, and the server's row is
      // merged back on top of the local one rather than replacing it, so the
      // locally-computed exercise_count survives the round trip.
      updateRoutine: async (id, patch) => {
        const previousRoutines = get().routines;

        set((state) => ({
          routines: state.routines.map((routine) =>
            routine.id === id ? { ...routine, ...patch } : routine
          ),
          error: null,
        }));

        try {
          const { routine } = await routinesApi.updateRoutine(id, patch);
          set((state) => ({
            routines: state.routines.map((r) => (r.id === id ? { ...r, ...routine } : r)),
          }));
          return { success: true, routine };
        } catch (error) {
          console.error('Failed to update routine:', error);
          set({ routines: previousRoutines, error: error.message });
          return { success: false, error: error.message };
        }
      },

      /**
       * Deletes a routine. This used to be refused with a 409 while a training
       * block pointed at the routine; mesocycles are user-scoped now, so the
       * only failure left here is a genuine network/server error — the block
       * just plans one routine fewer from the next request on.
       */
      deleteRoutine: async (id) => {
        const previousRoutines = get().routines;
        const previousDetail = get().activeRoutineDetail;
        const wasActive = previousDetail?.id === id;

        set((state) => ({
          routines: state.routines.filter((routine) => routine.id !== id),
          ...(wasActive ? { activeRoutineDetail: null } : {}),
          error: null,
        }));

        try {
          await routinesApi.deleteRoutine(id);
          return { success: true };
        } catch (error) {
          console.error('Failed to delete routine:', error);
          set({
            routines: previousRoutines,
            ...(wasActive ? { activeRoutineDetail: previousDetail } : {}),
            error: error.message,
          });
          return { success: false, error: error.message };
        }
      },

      /**
       * Saves a routine's exercise list as a whole, given what the user just
       * selected and what the routine held when the picker opened.
       *
       * The membership POST is an upsert and can never drop a row, so the
       * removals have to be explicit DELETEs — the same asymmetry
       * removeExerciseFromRoutine deals with. Additions go up batched; only
       * the deselected ones are deleted, so an untouched exercise keeps the
       * target sets/reps it was already given.
       */
      syncRoutineExercises: async (
        routineId,
        selectedIds = [],
        currentIds = [],
        targetsById = {}
      ) => {
        const selected = new Set(selectedIds);
        const toRemove = currentIds.filter((id) => !selected.has(id));

        set({ isSavingRoutine: true, error: null });
        try {
          // Every selected exercise, not just the newly added ones: the endpoint
          // upserts on (routine_id, exercise_id), so one call covers both
          // joining an exercise and changing the sets/reps of one already in
          // the routine. Sending only additions would silently drop a retyped
          // target on an exercise whose membership did not change.
          if (selectedIds.length > 0) {
            await routinesApi.setRoutineExercises(
              routineId,
              selectedIds.map((exerciseId) => ({
                exercise_id: exerciseId,
                // Omitted rather than sent as undefined when unknown, so the
                // API applies its own 3x8 default instead of rejecting a null.
                ...(targetsById[exerciseId]?.sets
                  ? { target_sets: targetsById[exerciseId].sets }
                  : {}),
                ...(targetsById[exerciseId]?.reps
                  ? { target_reps: targetsById[exerciseId].reps }
                  : {}),
              }))
            );
          }

          for (const exerciseId of toRemove) {
            await routinesApi.removeRoutineExercise(routineId, exerciseId);
          }

          const { routine } = await routinesApi.getRoutine(routineId);
          const count = routine?.exercises?.length ?? 0;

          set((state) => ({
            routines: state.routines.map((r) =>
              r.id === routineId ? { ...r, exercise_count: count } : r
            ),
            ...(state.activeRoutineDetail?.id === routineId
              ? { activeRoutineDetail: routine }
              : {}),
          }));

          if (get().activeMesocycleId) {
            await get().refreshPlan();
          }

          return { success: true, routine };
        } catch (error) {
          console.error('Failed to save routine exercises:', error);
          set({ error: error.message });
          return { success: false, error: error.message };
        } finally {
          set({ isSavingRoutine: false });
        }
      },

      // Adds an existing catalog exercise to a routine — Train's "add
      // exercise" only ever picks from the catalog now, never creates one —
      // and refreshes the cached routine detail so the new membership shows
      // up without waiting for the next focus.
      addExerciseToRoutine: async (routineId, exerciseId, targetSets, targetReps) => {
        const result = await get().setExerciseRoutine(routineId, exerciseId, targetSets, targetReps);
        if (result.success) {
          try {
            const { routine } = await routinesApi.getRoutine(routineId);
            set({ activeRoutineDetail: routine });
          } catch (error) {
            console.error('Failed to refresh routine detail:', error);
          }
        }
        return result;
      },

      /**
       * Removes an exercise from a routine. This only drops the
       * routine_exercises row — the catalog exercise itself, and its
       * membership in any other routine, is untouched. Optimistic with
       * rollback, the same shape as the rest of this store.
       */
      removeExerciseFromRoutine: async (routineId, exerciseId) => {
        const previousDetail = get().activeRoutineDetail;

        if (previousDetail?.id === routineId) {
          set({
            activeRoutineDetail: {
              ...previousDetail,
              exercises: previousDetail.exercises.filter((ex) => ex.exercise_id !== exerciseId),
            },
          });
        }

        try {
          await routinesApi.removeRoutineExercise(routineId, exerciseId);
          if (get().activeMesocycleId) {
            await get().refreshPlan();
          }
          return { success: true };
        } catch (error) {
          console.error('Failed to remove exercise from routine:', error);
          set({ activeRoutineDetail: previousDetail, error: error.message });
          return { success: false, error: error.message };
        }
      },
    }),
    {
      name: 'mesocycle-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
