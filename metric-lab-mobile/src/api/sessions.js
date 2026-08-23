import { apiRequest } from './client';

// Workout session lifecycle (FRONTEND_TODO 2.6): open a session, log sets into
// it, close it, and page through finished ones. The legacy one-shot
// POST /sessions/sync stays untouched on the backend for the already-installed
// APK, but this app now talks to these lifecycle endpoints instead.

// Idempotent on the backend: if a session is already open for this user it is
// returned (200, resumed: true) instead of erroring, so this is safe to call
// opportunistically as well as from an explicit "start workout" action.
export const startSession = (payload) => apiRequest('/sessions', { method: 'POST', body: payload });

// { session, summary } — both null when no workout is currently open.
export const getActiveSession = () => apiRequest('/sessions?active=true');

// Finished sessions only, newest first.
export const getSessionHistory = ({ limit, offset } = {}) => {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set('limit', String(limit));
  if (offset !== undefined) params.set('offset', String(offset));
  const qs = params.toString();
  return apiRequest(`/sessions${qs ? `?${qs}` : ''}`);
};

export const finishSession = (id, payload) =>
  apiRequest(`/sessions?id=${id}`, { method: 'PATCH', body: payload });

export const logSessionSet = (sessionId, payload) =>
  apiRequest(`/sessions/logs?session_id=${sessionId}`, { method: 'POST', body: payload });
