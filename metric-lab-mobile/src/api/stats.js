import { apiRequest } from './client';

// Shares the /data/stats route behind resource=monthly-one-rm — same
// Vercel-function-ceiling reasoning as oneRm.js/routines.js: per-exercise
// best 1RM for the previous and current calendar month, filtered
// server-side to the active routine's exercises. If the backend lands this
// under a slightly different resource name, this constant is the one line
// that needs to change.
export const MONTHLY_ONE_RM_RESOURCE = 'monthly-one-rm';

// Expected response shape:
// {
//   comparison: [
//     { exerciseId, exerciseName, previousMonth: number | null, currentMonth: number | null },
//     ...
//   ]
// }
// One entry per exercise in the active routine, including exercises with no
// logged sets in a given month (previousMonth/currentMonth null, not dropped).
// routineId is required by the backend to scope the exercise list.
export const getMonthlyOneRmComparison = (routineId) =>
  apiRequest(`/data/stats?resource=${MONTHLY_ONE_RM_RESOURCE}&routineId=${routineId}`);
