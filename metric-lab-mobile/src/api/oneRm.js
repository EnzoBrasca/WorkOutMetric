import { apiRequest } from './client';

// Shares the /data/sync route behind resource=one-rm — Vercel counts every file
// under api/ as a serverless function and the Hobby plan allows 12 — but stays a
// separate request from the bulk exercise upsert on purpose: postgrest-js
// normalises the column set across upserted rows, so carrying one_rm in that
// payload would blank it on every exercise whose entry omitted it.
export const setOneRm = (exerciseId, oneRm) =>
  apiRequest('/data/sync?resource=one-rm', {
    method: 'POST',
    body: { exercise_id: exerciseId, one_rm: oneRm },
  });

// Same endpoint, the other accepted shape: estimates the 1RM from a set the
// user actually did (Epley, server-side) instead of taking the number
// directly. This is what the exercise catalog (Config screen) uses — entering
// a set is what marks the resulting 1RM as user-owned (isManual: true) rather
// than one merely backfilled from logged history.
export const estimateOneRm = (exerciseId, weight, reps) =>
  apiRequest('/data/sync?resource=one-rm', {
    method: 'POST',
    body: { exercise_id: exerciseId, weight, reps },
  });
