import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as sessionsApi from '../api/sessions';

const HISTORY_PAGE_SIZE = 20;

// Workout session lifecycle (FRONTEND_TODO 2.6).
//
// `activeSession` is the raw workout_sessions row — used for its id when
// logging sets or finishing. `activeSummary` is the server-computed
// SessionSummary used for display (exerciseCount, totalSets, etc). Both come
// back together from GET /sessions?active=true and are re-fetched after every
// mutation so the active-session bar's counters move as sets get logged.
export const useSessionStore = create(
  persist(
    (set, get) => ({
      activeSession: null,
      activeSummary: null,
      isLoadingActive: false,
      isStartingSession: false,
      isFinishingSession: false,

      history: [],
      historyOffset: 0,
      hasMoreHistory: true,
      isLoadingHistory: false,
      isLoadingMoreHistory: false,
      historyError: null,

      error: null,

      // Called on screen focus (and picks up the persisted value immediately
      // on cold start) so a workout started earlier — or before the app was
      // killed — is resumed instead of lost.
      refreshActiveSession: async () => {
        set({ isLoadingActive: true, error: null });
        try {
          const { session, summary } = await sessionsApi.getActiveSession();
          set({ activeSession: session, activeSummary: summary });
        } catch (error) {
          console.error('Failed to load active session:', error);
          set({ error: error.message });
        } finally {
          set({ isLoadingActive: false });
        }
      },

      // Idempotent on the backend (returns the existing open session instead
      // of erroring), and idempotent here too: a session already held in
      // state is returned without a network round trip.
      startSession: async ({ routineId, mesocycleId, mesocycleWeek, notes } = {}) => {
        const existing = get().activeSession;
        if (existing) return existing;

        set({ isStartingSession: true, error: null });
        try {
          const { session } = await sessionsApi.startSession({
            routine_id: routineId,
            mesocycle_id: mesocycleId,
            mesocycle_week: mesocycleWeek,
            notes,
          });
          if (session) {
            set({ activeSession: session });
            await get().refreshActiveSession();
          }
          return session ?? null;
        } catch (error) {
          console.error('Failed to start session:', error);
          set({ error: error.message });
          return null;
        } finally {
          set({ isStartingSession: false });
        }
      },

      // Guarantees an open session exists — starting one silently if needed —
      // and returns its id (or null if starting one failed). This is what
      // lets logging an exercise never silently fail for lack of a session.
      ensureActiveSessionId: async (context) => {
        const current = get().activeSession;
        if (current?.id) return current.id;

        const session = await get().startSession(context);
        return session?.id ?? null;
      },

      logSet: async (sessionId, payload) => {
        if (!sessionId) return null;
        try {
          const { log } = await sessionsApi.logSessionSet(sessionId, payload);
          // Refresh so the active-session bar's exercise/set counters move.
          await get().refreshActiveSession();
          return log ?? null;
        } catch (error) {
          console.error('Failed to log set:', error);
          set({ error: error.message });
          return null;
        }
      },

      finishSession: async (notes) => {
        const session = get().activeSession;
        if (!session) return { success: false };

        set({ isFinishingSession: true, error: null });
        try {
          await sessionsApi.finishSession(session.id, { notes });
          set({ activeSession: null, activeSummary: null });
          return { success: true };
        } catch (error) {
          console.error('Failed to finish session:', error);
          set({ error: error.message });
          return { success: false, error: error.message };
        } finally {
          set({ isFinishingSession: false });
        }
      },

      loadHistory: async () => {
        set({ isLoadingHistory: true, historyError: null });
        try {
          const { sessions, limit } = await sessionsApi.getSessionHistory({
            limit: HISTORY_PAGE_SIZE,
            offset: 0,
          });
          set({
            history: sessions,
            historyOffset: sessions.length,
            hasMoreHistory: sessions.length === limit,
          });
        } catch (error) {
          console.error('Failed to load session history:', error);
          set({ historyError: error.message });
        } finally {
          set({ isLoadingHistory: false });
        }
      },

      loadMoreHistory: async () => {
        if (get().isLoadingMoreHistory || !get().hasMoreHistory) return;

        set({ isLoadingMoreHistory: true, historyError: null });
        try {
          const offset = get().historyOffset;
          const { sessions, limit } = await sessionsApi.getSessionHistory({
            limit: HISTORY_PAGE_SIZE,
            offset,
          });
          set((state) => ({
            history: [...state.history, ...sessions],
            historyOffset: offset + sessions.length,
            hasMoreHistory: sessions.length === limit,
          }));
        } catch (error) {
          console.error('Failed to load more session history:', error);
          set({ historyError: error.message });
        } finally {
          set({ isLoadingMoreHistory: false });
        }
      },
    }),
    {
      name: 'session-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only the active session survives a restart; history and loading
      // flags are always re-fetched fresh.
      partialize: (state) => ({
        activeSession: state.activeSession,
        activeSummary: state.activeSummary,
      }),
    }
  )
);
