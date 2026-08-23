// Estimating a 1RM from a single set.
//
// Epley: 1RM = weight * (1 + reps / 30). It was previously a private helper in
// statsService; it lives here because the same formula now has two callers —
// deriving a 1RM from logged history, and deriving one from the weight x reps a
// user types into the config screen.
//
// Distinct from mesocycleCalculator, which goes the other way: from a known 1RM
// to the target weight and reps for a given week.

/**
 * Above this many reps Epley drifts badly — it is fitted to low-rep sets and
 * overestimates as reps climb (a 20-rep set comes out roughly 30% high). Callers
 * warn rather than refuse: the estimate is still the user's data.
 */
export const RELIABLE_REP_LIMIT = 10;

export interface OneRmEstimate {
  oneRm: number;
  /** True when reps exceeded RELIABLE_REP_LIMIT and the estimate is inflated. */
  lowConfidence: boolean;
}

export function epley1RM(weight: number, reps: number): number {
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return 0;
  if (weight <= 0 || reps <= 0) return 0;

  return weight * (1 + reps / 30);
}

/**
 * A 1RM estimate rounded to the nearest 0.5kg, with a flag when the rep count
 * puts it outside the range Epley is trustworthy in.
 */
export function estimateOneRm(weight: number, reps: number): OneRmEstimate {
  const raw = epley1RM(Number(weight), Number(reps));

  return {
    oneRm: Math.round(raw * 2) / 2,
    lowConfidence: raw > 0 && Number(reps) > RELIABLE_REP_LIMIT,
  };
}
