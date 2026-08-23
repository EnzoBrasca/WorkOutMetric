import { apiRequest } from './client';

// A mesocycle is a multi-week training block bound to a routine. Weight/reps
// targets are never stored client-side: the plan endpoint derives them per
// request from each exercise's 1RM and the requested week's %1RM, so the
// client just asks for a week and renders whatever comes back.

export const listMesocycles = () => apiRequest('/mesocycles');

export const createMesocycle = (payload) =>
  apiRequest('/mesocycles', { method: 'POST', body: payload });

export const setMesocycleWeek = (id, currentWeek) =>
  apiRequest(`/mesocycles?id=${id}`, {
    method: 'PATCH',
    body: { current_week: currentWeek },
  });

export const deleteMesocycle = (id) =>
  apiRequest(`/mesocycles?id=${id}`, { method: 'DELETE' });

// `week` requests a specific week, `all` requests every week of the block.
// With neither, the backend defaults to the mesocycle's current week.
//
// Shares the /mesocycles route behind resource=plan: Vercel counts every file
// under api/ as a serverless function and the Hobby plan allows 12.
export const getMesocyclePlan = (id, { week, all } = {}) => {
  const params = new URLSearchParams({ resource: 'plan', id });
  if (week !== undefined) params.set('week', String(week));
  if (all) params.set('all', 'true');
  return apiRequest(`/mesocycles?${params.toString()}`);
};
