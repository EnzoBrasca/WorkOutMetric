import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,

      token: null,
      // The access token Supabase issues lives one hour. Without keeping the
      // refresh token too, a persisted session came back from storage looking
      // valid, 401'd on every request, and read on screen as "you have no
      // exercises" instead of "your session expired".
      refreshToken: null,

      login: async (username, password) => {
        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Login failed');
          
          set({
            isAuthenticated: true,
            user: data.user,
            token: data.session.access_token,
            refreshToken: data.session.refresh_token,
          });
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
          
          set({
            isAuthenticated: true,
            user: data.user,
            token: data.session.access_token,
            refreshToken: data.session.refresh_token,
          });
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
      
      // Trades the stored refresh token for a fresh session. Returns the new
      // access token on success, or null when the refresh token is itself dead
      // — in which case the session is cleared and the user lands back on the
      // login screen, rather than sitting in an app that silently shows nothing.
      refreshSession: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) {
          set({ isAuthenticated: false, user: null, token: null, refreshToken: null });
          return null;
        }

        try {
          const response = await fetch(`${API_URL}/auth/login?grant_type=refresh_token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Refresh failed');

          set({
            isAuthenticated: true,
            user: data.user,
            token: data.session.access_token,
            refreshToken: data.session.refresh_token,
          });
          return data.session.access_token;
        } catch (error) {
          set({ isAuthenticated: false, user: null, token: null, refreshToken: null });
          return null;
        }
      },

      logout: () => {
        set({ isAuthenticated: false, user: null, token: null, refreshToken: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
