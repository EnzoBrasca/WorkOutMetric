import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export const useAuthStore = create(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,

      token: null,
      
      login: async (username, password) => {
        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Login failed');
          
          set({ isAuthenticated: true, user: data.user, token: data.session.access_token });
          if (data.user.preferences) {
            import('./useSettingsStore').then(m => m.useSettingsStore.getState().loadPreferences(data.user.preferences));
          }
          // Load their exercises from the cloud
          import('./useWorkoutStore').then(m => m.useWorkoutStore.getState().loadExercises());
          import('./useConfigStore').then(m => m.useConfigStore.getState().loadStats());
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      
      register: async (username, password) => {
        try {
          const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Registration failed');
          
          set({ isAuthenticated: true, user: data.user, token: data.session.access_token });
          // Save default preferences to cloud
          import('./useSettingsStore').then(m => m.useSettingsStore.getState().syncPreferences());
          // Load their exercises from the cloud
          import('./useWorkoutStore').then(m => m.useWorkoutStore.getState().loadExercises());
          import('./useConfigStore').then(m => m.useConfigStore.getState().loadStats());
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },
      
      logout: () => {
        set({ isAuthenticated: false, user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
