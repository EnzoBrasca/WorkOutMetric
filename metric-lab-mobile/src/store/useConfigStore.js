import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const defaultLifts = [
  { id: '1', type: 'COMPOUND', name: 'BARBELL SQUAT', value: '140', prev: '135' },
  { id: '2', type: 'COMPOUND', name: 'DEADLIFT', value: '180', prev: '175' },
  { id: '3', type: 'COMPOUND', name: 'BENCH PRESS', value: '105', prev: '100' },
  { id: '4', type: 'ACCESSORY', name: 'OVERHEAD PRESS', value: '70', prev: '65' },
  { id: '5', type: 'ACCESSORY', name: 'BARBELL ROW', value: '95', prev: '90' },
  { id: '6', type: 'ACCESSORY', name: 'PULL UP (WGT)', value: '25', prev: '20' },
];

export const useConfigStore = create(
  persist(
    (set) => ({
      lifts1rm: defaultLifts,
      loadStats: async () => {
        // Fetch real stats from cloud using API
        const { useAuthStore } = require('./useAuthStore');
        const userId = useAuthStore.getState().user?.id;
        const token = useAuthStore.getState().token;
        if (!userId) return;

        try {
          const { API_URL } = require('../config/api');
          const response = await fetch(`${API_URL}/data/stats?user_id=${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          if (response.ok && data.stats && data.stats.length > 0) {
            set({ lifts1rm: data.stats });
          }
        } catch (error) {
          console.error('Failed to load stats:', error);
        }
      },
      updateLift: (id, newValue) =>
        set((state) => ({
          lifts1rm: state.lifts1rm.map((lift) =>
            lift.id === id ? { ...lift, value: newValue } : lift
          ),
        })),
      resetLifts: () => set({ lifts1rm: defaultLifts }),
      saveConfig: (newLifts) => set({ lifts1rm: newLifts }),
    }),
    {
      name: 'config-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
