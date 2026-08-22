import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { API_URL } from '../config/api';
import { useAuthStore } from './useAuthStore';

export const useWorkoutStore = create(
  persist(
    (set, get) => ({
      activeTab: 'push', // 'push' | 'pull'
      setActiveTab: (tab) => set({ activeTab: tab }),

      exercises: [],
      isLoading: false,
      
      // Call this when user logs in to fetch their cloud exercises
      loadExercises: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        const token = useAuthStore.getState().token;
        
        set({ isLoading: true });
        try {
          const response = await fetch(`${API_URL}/data/sync?user_id=${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (response.ok && data.exercises) {
            // Map backend muscle_group back to frontend type
            const loaded = data.exercises.map(ex => ({
              ...ex,
              type: ex.muscle_group?.toLowerCase() || 'push'
            }));
            set({ exercises: loaded });
          }
        } catch (error) {
          console.error('Failed to load exercises:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      // Call this after making changes to sync up to the cloud
      syncExercises: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        const token = useAuthStore.getState().token;
        
        try {
          await fetch(`${API_URL}/data/sync?user_id=${userId}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ exercises: get().exercises })
          });
        } catch (error) {
          console.error('Failed to sync exercises:', error);
        }
      },

      addExercise: (exerciseData) => {
        set((state) => ({
          exercises: [
            ...state.exercises,
            {
              id: uuid.v4(),
              ...exerciseData,
              type: state.activeTab,
            },
          ],
        }));
        get().syncExercises();
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
          const response = await fetch(`${API_URL}/data/sync?id=${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok && response.status !== 404) {
            throw new Error(`Delete failed with status ${response.status}`);
          }
        } catch (error) {
          console.error('Failed to delete exercise:', error);
          // Put it back rather than leaving local and cloud out of sync.
          set({ exercises: previous });
        }
      },
      
      sessionLogs: [],
      logSession: async (exerciseId, completedSets, completedReps) => {
        const newLog = {
          id: uuid.v4(),
          exerciseId,
          date: new Date().toISOString(),
          completedSets,
          completedReps,
        };

        set((state) => ({
          sessionLogs: [...state.sessionLogs, newLog],
        }));

        // Sync to cloud
        const userId = useAuthStore.getState().user?.id;
        const token = useAuthStore.getState().token;
        if (!userId) return;

        try {
          await fetch(`${API_URL}/sessions/sync`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              user_id: userId,
              routine_id: null, // We don't have explicit routines tied to sessions yet
              started_at: newLog.date,
              ended_at: newLog.date,
              logs: [{
                exercise_id: exerciseId,
                completed_sets: completedSets,
                completed_reps: completedReps,
                weight: get().exercises.find(ex => ex.id === exerciseId)?.weight || 0,
                logged_at: newLog.date
              }]
            })
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
