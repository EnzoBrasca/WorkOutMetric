// Week-based progressive overload for a mesocycle.
//
// Intensity is expressed as a percentage of each exercise's 1RM. Week 1 sits at
// `start_pct` and every subsequent *training* week adds `increment_pct`, so the
// defaults (60 / +10) reproduce a 60% -> 70% -> 80% three-week block. Longer
// blocks just keep stepping by whatever increment the user configured.
//
// Target reps come from a reference %1RM -> reps table, NOT from an inverted
// Epley. Epley (used in statsService to *estimate* a 1RM) is only accurate in
// the 1-10 rep range and overshoots badly below ~75%: inverting it puts 60% at
// 20 reps and a 50% deload at 30 reps, which is not a usable prescription.
//
// A deload week is not part of the ramp: it holds its own percentage and does
// not consume an increment step, so the weeks after it resume where the ramp
// left off.

export interface MesocycleConfig {
  total_weeks: number;
  start_pct: number;
  increment_pct: number;
  deload_enabled: boolean;
  deload_week: number | null;
  deload_pct: number;
}

export interface PlannedExerciseInput {
  exercise_id: string;
  name: string;
  target_sets: number;
  one_rm: number | null;
}

export interface PlannedExercise {
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps: number;
  /** null when the exercise has no 1RM on record yet — the client must ask for one. */
  targetWeight: number | null;
  oneRm: number | null;
  needsOneRm: boolean;
}

export interface WeekPlan {
  week: number;
  percent: number;
  isDeload: boolean;
  exercises: PlannedExercise[];
}

// Reference table, descending by percentage. Values between two anchors are
// linearly interpolated; anything outside the range clamps to the nearest end.
const PERCENT_TO_REPS: ReadonlyArray<readonly [percent: number, reps: number]> = [
  [100, 1],
  [95, 2],
  [93, 3],
  [90, 4],
  [87, 5],
  [85, 6],
  [83, 7],
  [80, 8],
  [77, 9],
  [75, 10],
  [72, 11],
  [70, 12],
  [67, 13],
  [65, 14],
  [63, 15],
  [60, 16],
  [57, 17],
  [55, 18],
  [53, 19],
  [50, 20],
];

// Prescribing more than 100% of a 1RM is meaningless, so a ramp that would
// overshoot is held at the ceiling rather than producing an impossible target.
const MAX_PERCENT = 100;

/** Smallest weight step the gym can actually load, in kg. */
const DEFAULT_WEIGHT_STEP = 2.5;

export function repsForPercent(percent: number): number {
  const first = PERCENT_TO_REPS[0];
  const last = PERCENT_TO_REPS[PERCENT_TO_REPS.length - 1];

  if (percent >= first[0]) return first[1];
  if (percent <= last[0]) return last[1];

  for (let i = 0; i < PERCENT_TO_REPS.length - 1; i++) {
    const [upperPct, upperReps] = PERCENT_TO_REPS[i];
    const [lowerPct, lowerReps] = PERCENT_TO_REPS[i + 1];

    if (percent <= upperPct && percent >= lowerPct) {
      const span = upperPct - lowerPct;
      if (span === 0) return upperReps;
      const ratio = (upperPct - percent) / span;
      return Math.round(upperReps + ratio * (lowerReps - upperReps));
    }
  }

  return last[1];
}

export function isDeloadWeek(config: MesocycleConfig, week: number): boolean {
  return config.deload_enabled && config.deload_week === week;
}

// How many training weeks precede `week`. Deload weeks are skipped so they do
// not push the ramp forward.
function rampStepsBefore(config: MesocycleConfig, week: number): number {
  let steps = 0;
  for (let w = 1; w < week; w++) {
    if (!isDeloadWeek(config, w)) steps++;
  }
  return steps;
}

export function percentForWeek(config: MesocycleConfig, week: number): number {
  if (isDeloadWeek(config, week)) return config.deload_pct;

  const raw = config.start_pct + rampStepsBefore(config, week) * config.increment_pct;
  return Math.min(raw, MAX_PERCENT);
}

export function targetWeightFor(
  oneRm: number,
  percent: number,
  step: number = DEFAULT_WEIGHT_STEP
): number {
  const raw = oneRm * (percent / 100);
  if (step <= 0) return Math.round(raw * 100) / 100;
  return Math.round(raw / step) * step;
}

export function planWeek(
  config: MesocycleConfig,
  exercises: PlannedExerciseInput[],
  week: number
): WeekPlan {
  if (!Number.isInteger(week) || week < 1 || week > config.total_weeks) {
    throw new Error(`Week ${week} is outside this mesocycle (1-${config.total_weeks})`);
  }

  const percent = percentForWeek(config, week);
  const targetReps = repsForPercent(percent);

  return {
    week,
    percent,
    isDeload: isDeloadWeek(config, week),
    exercises: exercises.map((ex) => {
      const oneRm = ex.one_rm != null && ex.one_rm > 0 ? Number(ex.one_rm) : null;

      return {
        exerciseId: ex.exercise_id,
        name: ex.name,
        targetSets: ex.target_sets,
        targetReps,
        targetWeight: oneRm === null ? null : targetWeightFor(oneRm, percent),
        oneRm,
        needsOneRm: oneRm === null,
      };
    }),
  };
}

/** Every week of the block, for previewing a whole mesocycle at a glance. */
export function planAllWeeks(
  config: MesocycleConfig,
  exercises: PlannedExerciseInput[]
): WeekPlan[] {
  const weeks: WeekPlan[] = [];
  for (let week = 1; week <= config.total_weeks; week++) {
    weeks.push(planWeek(config, exercises, week));
  }
  return weeks;
}
