// Estimating a 1RM from a single set.
//
// Epley: 1RM = weight * (1 + reps / 30), except at a single rep, which is a
// measurement rather than an estimate (see epley1RM). It was previously a
// private helper in statsService; it lives here because the formula has two callers —
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

  // A single rep is not estimated, it is observed: the user lifted this weight
  // once, so that IS their one-rep max. Epley is a regression fitted to
  // multi-rep sets and its algebraic form does not degenerate at reps = 1 —
  // it returns weight * 31/30, reporting a 70kg single back as 72.5kg. Taking
  // the measured case first also keeps the estimate from ever exceeding a
  // heavier single the user actually performed.
  if (reps === 1) return weight;

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
