import { apiRequest } from './client';

export const listRoutines = () => apiRequest('/routines');

export const getRoutine = (id) => apiRequest(`/routines?id=${id}`);

export const createRoutine = (payload) =>
  apiRequest('/routines', { method: 'POST', body: payload });

export const deleteRoutine = (id) => apiRequest(`/routines?id=${id}`, { method: 'DELETE' });

export const setRoutineExercises = (routineId, exercises) =>
  apiRequest(`/routines/exercises?routine_id=${routineId}`, {
    method: 'POST',
    body: { exercises },
  });

export const removeRoutineExercise = (routineId, exerciseId) =>
  apiRequest(`/routines/exercises?routine_id=${routineId}&exercise_id=${exerciseId}`, {
    method: 'DELETE',
  });
