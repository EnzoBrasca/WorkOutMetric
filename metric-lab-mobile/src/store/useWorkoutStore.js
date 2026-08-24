import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { API_URL } from '../config/api';
import { apiRequest } from '../api/client';
import { useAuthStore } from './useAuthStore';
import { useMesocycleStore } from './useMesocycleStore';
import { useSessionStore } from './useSessionStore';

export const useWorkoutStore = create(
  persist(
    (set, get) => ({
      activeTab: 'push', // 'push' | 'pull'
      setActiveTab: (tab) => set({ activeTab: tab }),

      exercises: [],
      isLoading: false,
      error: null,

      // Call this when user logs in to fetch their cloud exercises
      loadExercises: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        set({ isLoading: true, error: null });
        try {
          // Goes through apiRequest so an expired access token is renewed and
          // retried. This used to call fetch directly and check
          // `response.ok && data.exercises`, which turned a 401 into a silent
          // no-op — the catalog just stayed empty with no error shown.
          const data = await apiRequest(`/data/sync?user_id=${userId}`);
          // Map backend muscle_group back to frontend type
          const loaded = (data.exercises ?? []).map(ex => ({
            ...ex,
            type: ex.muscle_group?.toLowerCase() || 'push'
          }));
          set({ exercises: loaded });
        } catch (error) {
          console.error('Failed to load exercises:', error);
          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      // Call this after making changes to sync up to the cloud
      syncExercises: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        try {
          await apiRequest(`/data/sync?user_id=${userId}`, {
            method: 'POST',
            body: { exercises: get().exercises },
          });
        } catch (error) {
          console.error('Failed to sync exercises:', error);
        }
      },

      // Returns the created exercise and awaits the sync, because callers need
      // its id AND need the row to exist server-side before anything can
      // reference it — routine_exercises.exercise_id is a foreign key, so
      // adding routine membership too early fails.
      //
      // `type` is explicit because callers now include the exercise catalog
      // (Config screen), which has no "current tab" to infer a type from.
      // Falls back to activeTab so any caller that omits it keeps the exact
      // behaviour this had before the catalog existed.
      addExercise: async (exerciseData, type) => {
        const exercise = {
          id: uuid.v4(),
          ...exerciseData,
          // An explicit null means "no push/pull yet" — the config catalog
          // creates exercises unassigned and the training screen assigns them.
          // Only an omitted argument falls back to the active tab, which is
          // what the older in-train creation flow relied on.
          type: type !== undefined ? type : get().activeTab,
        };

        set((state) => ({ exercises: [...state.exercises, exercise] }));
        await get().syncExercises();

        return exercise;
      },
      
      updateExercise: (id, updatedData) => {
        set((state) => ({
          exercises: state.exercises.map((ex) =>
            ex.id === id ? { ...ex, ...updatedData } : ex
          ),
        }));
        get().syncExercises();
      },
      
      removeExercise: async (id) => {
        const previous = get().exercises;

        set((state) => ({
          exercises: state.exercises.filter((ex) => ex.id !== id),
        }));

        const token = useAuthStore.getState().token;
        if (!token) return;

        // Deletion needs its own endpoint: syncExercises is an upsert and can
        // never remove a row, so calling it here would leave the exercise in
        // the cloud and bring it back on the next loadExercises.
        try {
          await apiRequest(`/data/sync?id=${id}`, { method: 'DELETE' });
        } catch (error) {
          // An already-deleted row is the outcome we wanted, so a 404 is not a
          // failure and must not roll the optimistic removal back.
          if (/404|not found/i.test(error.message)) return;

          console.error('Failed to delete exercise:', error);
          // Put it back rather than leaving local and cloud out of sync.
          set({ exercises: previous });
        }
      },
      
      sessionLogs: [],
      // targetWeight comes from the active mesocycle's plan when one covers this
      // exercise. It has to be logged in place of the exercise's free-text
      // weight: set_logs.weight is what statsService derives 1RM from, so
      // recording the stale field would feed a wrong 1RM straight back into the
      // percentages the next mesocycle week is calculated from.
      logSession: async (exerciseId, completedSets, completedReps, targetWeight) => {
        const loggedWeight =
          targetWeight ?? (get().exercises.find((ex) => ex.id === exerciseId)?.weight || 0);

        const newLog = {
          id: uuid.v4(),
          exerciseId,
          date: new Date().toISOString(),
          completedSets,
          completedReps,
          weight: loggedWeight,
        };

        set((state) => ({
          sessionLogs: [...state.sessionLogs, newLog],
        }));

        // Feeds the OPEN workout session (FRONTEND_TODO 2.6) instead of the
        // legacy one-shot /sessions/sync path: auto-starts a session if none
        // is open yet — tagged with the active mesocycle's id/week when one
        // is running, so history records which block/week produced the
        // numbers — so logging an exercise can never silently fail for lack
        // of an open session. /sessions/sync itself is untouched on the
        // backend (the already-installed APK still posts there); only this
        // client no longer calls it.
        const token = useAuthStore.getState().token;
        if (!token) return;

        try {
          const { activeMesocycleId, mesocycles } = useMesocycleStore.getState();
          const activeMesocycle = mesocycles.find((m) => m.id === activeMesocycleId);

          const sessionId = await useSessionStore.getState().ensureActiveSessionId({
            mesocycleId: activeMesocycleId || undefined,
            mesocycleWeek: activeMesocycle?.current_week,
          });
          if (!sessionId) return;

          await useSessionStore.getState().logSet(sessionId, {
            exercise_id: exerciseId,
            completed_sets: completedSets,
            completed_reps: completedReps,
            weight: loggedWeight,
            logged_at: newLog.date,
          });
        } catch (error) {
          console.error('Failed to sync session log:', error);
        }
      },
    }),
    {
      name: 'workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
