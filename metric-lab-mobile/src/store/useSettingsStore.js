import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // 'dark', 'light', 'custom'
      font: 'PixelifySans_400Regular', 
      language: 'en', // 'en', 'es'
      customColors: {
        background: '#09090b',
        primary: '#39ff14',
        textPrimary: '#e2e2e2'
      },
      
      setTheme: (theme) => {
        set({ theme });
        get().syncPreferences();
      },
      setFont: (font) => {
        set({ font });
        get().syncPreferences();
      },
      setLanguage: (language) => {
        set({ language });
        get().syncPreferences();
      },
      setCustomColor: (key, value) => {
        set((state) => ({ 
          customColors: { ...state.customColors, [key]: value } 
        }));
        get().syncPreferences();
      },
      loadPreferences: (prefs) => {
        if (prefs) {
          set({
            theme: prefs.theme || 'dark',
            font: prefs.font || 'PixelifySans_400Regular',
            language: prefs.language || 'en',
            customColors: prefs.customColors || {
              background: '#09090b',
              primary: '#39ff14',
              textPrimary: '#e2e2e2'
            }
          });
        }
      },
      syncPreferences: async () => {
        try {
          const authStore = (await import('./useAuthStore')).useAuthStore.getState();
          if (!authStore.isAuthenticated) return;
          
          const state = get();
          const preferences = {
            theme: state.theme,
            font: state.font,
            language: state.language,
            customColors: state.customColors
          };

          await fetch(`${API_URL}/auth/preferences`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authStore.token}`
            },
            body: JSON.stringify({ preferences })
          });
        } catch (error) {
          console.error('Failed to sync preferences', error);
        }
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
