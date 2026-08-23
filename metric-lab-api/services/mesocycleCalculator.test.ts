import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MesocycleConfig,
  PlannedExerciseInput,
  isDeloadWeek,
  percentForWeek,
  planAllWeeks,
  planWeek,
  repsForPercent,
  targetWeightFor,
} from './mesocycleCalculator';

const baseConfig: MesocycleConfig = {
  total_weeks: 3,
  start_pct: 60,
  increment_pct: 10,
  deload_enabled: false,
  deload_week: null,
  deload_pct: 50,
};

const config = (overrides: Partial<MesocycleConfig> = {}): MesocycleConfig => ({
  ...baseConfig,
  ...overrides,
});

const exercises: PlannedExerciseInput[] = [
  { exercise_id: 'squat-id', name: 'BARBELL SQUAT', target_sets: 4, one_rm: 140 },
  { exercise_id: 'bench-id', name: 'BENCH PRESS', target_sets: 3, one_rm: 100 },
];

describe('repsForPercent', () => {
  test('reads the table anchors the default ramp lands on', () => {
    assert.equal(repsForPercent(60), 16);
    assert.equal(repsForPercent(70), 12);
    assert.equal(repsForPercent(80), 8);
  });

  test('does not reproduce inverted Epley in the low-percentage range', () => {
    // Inverted Epley would say 20 reps at 60% and 30 at 50%. Both are unusable
    // as a prescription, which is why the table exists.
    assert.notEqual(repsForPercent(60), 20);
    assert.equal(repsForPercent(50), 20);
  });

  test('interpolates between anchors', () => {
    // Between 70% (12 reps) and 67% (13 reps).
    assert.equal(repsForPercent(68), 13);
    assert.equal(repsForPercent(69.5), 12);
  });

  test('clamps outside the table', () => {
    assert.equal(repsForPercent(100), 1);
    assert.equal(repsForPercent(120), 1);
    assert.equal(repsForPercent(40), 20);
  });
});

describe('percentForWeek', () => {
  test('ramps 60 -> 70 -> 80 with the defaults', () => {
    assert.equal(percentForWeek(config(), 1), 60);
    assert.equal(percentForWeek(config(), 2), 70);
    assert.equal(percentForWeek(config(), 3), 80);
  });

  test('honours a custom increment for longer blocks', () => {
    const longer = config({ total_weeks: 5, increment_pct: 5 });
    assert.deepEqual(
      [1, 2, 3, 4, 5].map((w) => percentForWeek(longer, w)),
      [60, 65, 70, 75, 80]
    );
  });

  test('caps at 100% instead of prescribing an impossible load', () => {
    const overshooting = config({ total_weeks: 8 });
    assert.equal(percentForWeek(overshooting, 5), 100);
    assert.equal(percentForWeek(overshooting, 6), 100);
  });

  test('a trailing deload week uses its own percentage', () => {
    const withDeload = config({
      total_weeks: 4,
      deload_enabled: true,
      deload_week: 4,
      deload_pct: 50,
    });

    assert.deepEqual(
      [1, 2, 3, 4].map((w) => percentForWeek(withDeload, w)),
      [60, 70, 80, 50]
    );
  });

  test('a mid-cycle deload does not consume a ramp step', () => {
    const midDeload = config({
      total_weeks: 5,
      deload_enabled: true,
      deload_week: 3,
      deload_pct: 50,
    });

    // Week 4 resumes at the 80% the ramp was due to reach, not 90%.
    assert.deepEqual(
      [1, 2, 3, 4, 5].map((w) => percentForWeek(midDeload, w)),
      [60, 70, 50, 80, 90]
    );
  });

  test('deload_week is ignored while deload_enabled is false', () => {
    const disabled = config({ deload_enabled: false, deload_week: 2 });
    assert.equal(isDeloadWeek(disabled, 2), false);
    assert.equal(percentForWeek(disabled, 2), 70);
  });
});

describe('targetWeightFor', () => {
  test('rounds to a loadable 2.5kg step', () => {
    assert.equal(targetWeightFor(140, 60), 85); // 84 raw
    assert.equal(targetWeightFor(100, 70), 70);
    assert.equal(targetWeightFor(102.5, 60), 62.5); // 61.5 raw
  });

  test('accepts a custom step', () => {
    assert.equal(targetWeightFor(140, 60, 5), 85);
    assert.equal(targetWeightFor(140, 60, 1), 84);
  });
});

describe('planWeek', () => {
  test('derives weight and reps for every exercise in the week', () => {
    const plan = planWeek(config(), exercises, 1);

    assert.equal(plan.week, 1);
    assert.equal(plan.percent, 60);
    assert.equal(plan.isDeload, false);
    assert.deepEqual(plan.exercises, [
      {
        exerciseId: 'squat-id',
        name: 'BARBELL SQUAT',
        targetSets: 4,
        targetReps: 16,
        targetWeight: 85,
        oneRm: 140,
        needsOneRm: false,
      },
      {
        exerciseId: 'bench-id',
        name: 'BENCH PRESS',
        targetSets: 3,
        targetReps: 16,
        targetWeight: 60,
        oneRm: 100,
        needsOneRm: false,
      },
    ]);
  });

  test('keeps each exercise on its own 1RM as the week advances', () => {
    const week3 = planWeek(config(), exercises, 3);

    assert.equal(week3.percent, 80);
    assert.equal(week3.exercises[0].targetWeight, 112.5); // 140 * 0.8
    assert.equal(week3.exercises[1].targetWeight, 80); // 100 * 0.8
    assert.equal(week3.exercises[0].targetReps, 8);
  });

  test('flags exercises with no 1RM instead of prescribing 0kg', () => {
    const plan = planWeek(config(), [
      { exercise_id: 'new-id', name: 'CABLE FLY', target_sets: 3, one_rm: null },
    ], 1);

    assert.equal(plan.exercises[0].targetWeight, null);
    assert.equal(plan.exercises[0].needsOneRm, true);
    // Reps still come through: they depend on the percentage, not the 1RM.
    assert.equal(plan.exercises[0].targetReps, 16);
  });

  test('treats a zero 1RM as missing', () => {
    const plan = planWeek(config(), [
      { exercise_id: 'zero-id', name: 'NEVER LOGGED', target_sets: 3, one_rm: 0 },
    ], 1);

    assert.equal(plan.exercises[0].needsOneRm, true);
    assert.equal(plan.exercises[0].targetWeight, null);
  });

  test('rejects a week outside the block', () => {
    assert.throws(() => planWeek(config(), exercises, 0), /outside this mesocycle/);
    assert.throws(() => planWeek(config(), exercises, 4), /outside this mesocycle/);
  });
});

describe('planAllWeeks', () => {
  test('returns one plan per week of the block', () => {
    const withDeload = config({
      total_weeks: 4,
      deload_enabled: true,
      deload_week: 4,
    });

    const weeks = planAllWeeks(withDeload, exercises);

    assert.equal(weeks.length, 4);
    assert.deepEqual(weeks.map((w) => w.week), [1, 2, 3, 4]);
    assert.deepEqual(weeks.map((w) => w.percent), [60, 70, 80, 50]);
    assert.deepEqual(weeks.map((w) => w.isDeload), [false, false, false, true]);
  });
});
