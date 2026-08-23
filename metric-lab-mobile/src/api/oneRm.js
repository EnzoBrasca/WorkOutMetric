import { apiRequest } from './client';

// Separate from exercise sync on purpose (mirrors the backend's own reasoning
// in api/data/one-rm.ts): the exercise list is upserted as a whole elsewhere,
// which would blank one_rm on any payload that omits it.
export const setOneRm = (exerciseId, oneRm) =>
  apiRequest('/data/one-rm', {
    method: 'POST',
    body: { exercise_id: exerciseId, one_rm: oneRm },
  });
