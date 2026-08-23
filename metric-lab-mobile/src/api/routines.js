import { apiRequest } from './client';

export const listRoutines = () => apiRequest('/routines');

export const getRoutine = (id) => apiRequest(`/routines?id=${id}`);

export const createRoutine = (payload) =>
  apiRequest('/routines', { method: 'POST', body: payload });

export const deleteRoutine = (id) => apiRequest(`/routines?id=${id}`, { method: 'DELETE' });

// Membership shares the /routines route behind resource=exercises: Vercel counts
// every file under api/ as a serverless function and the Hobby plan allows 12.
export const setRoutineExercises = (routineId, exercises) =>
  apiRequest(`/routines?resource=exercises&routine_id=${routineId}`, {
    method: 'POST',
    body: { exercises },
  });

export const removeRoutineExercise = (routineId, exerciseId) =>
  apiRequest(
    `/routines?resource=exercises&routine_id=${routineId}&exercise_id=${exerciseId}`,
    { method: 'DELETE' }
  );
