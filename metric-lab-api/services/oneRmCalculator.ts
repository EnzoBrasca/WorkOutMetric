// Estimating a 1RM from a single set.
//
// Epley: 1RM = weight * (1 + reps / 30). Brzycki: 1RM = weight / (1.0278 -
// 0.0278 * reps) — a reciprocal, not a line, so it climbs toward infinity as
// reps nears 37 instead of growing steadily like Epley. Both agree that a
// single rep is a measurement, not an estimate (see epley1RM).
//
// Brzycki is only trusted within RELIABLE_REP_LIMIT: past that range it
// diverges upward FASTER than Epley (100kg x 20 claims 212kg from Brzycki
// against Epley's already-generous 167kg), so blending it in there would make
// the estimate worse, not better. blendedOneRm averages the two low-rep,
// where both are considered accurate, and falls back to Epley alone once
// reps exceed that range or run past Brzycki's mathematical domain.
//
// This lived as a private helper in statsService; it moved here because the
// formula has two callers — deriving a 1RM from logged history, and deriving
// one from the weight x reps a user types into the config screen.
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
 * Brzycki's estimate, or null when it cannot give one: unusable input, or
 * reps at/past ~37 where the denominator hits zero and the formula stops
 * meaning anything (a negative or unbounded "1RM").
 */
export function brzycki1RM(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;
  if (weight <= 0 || reps <= 0) return null;
  if (reps === 1) return weight;

  const denominator = 1.0278 - 0.0278 * reps;
  if (denominator <= 0) return null;

  return weight / denominator;
}

/**
 * The raw (unrounded) 1RM estimate: Epley and Brzycki averaged within the
 * rep range both are considered reliable in, Epley alone beyond it — either
 * because Brzycki is past RELIABLE_REP_LIMIT (where it diverges harder than
 * Epley does) or past its own mathematical domain entirely.
 */
export function blendedOneRm(weight: number, reps: number): number {
  const epley = epley1RM(weight, reps);
  if (reps > RELIABLE_REP_LIMIT) return epley;

  const brzycki = brzycki1RM(weight, reps);
  return brzycki === null ? epley : (epley + brzycki) / 2;
}

/**
 * A 1RM estimate rounded to the nearest 0.5kg, with a flag when the rep count
 * puts it outside the range these formulas are trustworthy in.
 */
export function estimateOneRm(weight: number, reps: number): OneRmEstimate {
  const w = Number(weight);
  const r = Number(reps);
  const raw = blendedOneRm(w, r);

  return {
    oneRm: Math.round(raw * 2) / 2,
    lowConfidence: raw > 0 && r > RELIABLE_REP_LIMIT,
  };
}
