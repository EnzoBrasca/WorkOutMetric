import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getMonthlyOneRmComparison, monthWindowsFor } from './monthlyOneRmService';

// A minimal path-aware stub: unlike the other service stubs in this codebase,
// this one actually applies eq/gte/lt so two calls against the same table
// (previous month vs. current month) can return different rows -- the whole
// point of the behavior under test.
function getPath(row: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), row);
}

function stubDb(tables: { routine_exercises?: any[]; set_logs?: any[] }) {
  return {
    from(table: string) {
      let rows = (tables as any)[table] ?? [];

      const builder: any = {
        select: () => builder,
        eq: (col: string, val: any) => {
          rows = rows.filter((r: any) => getPath(r, col) === val);
          return builder;
        },
        gte: (col: string, val: string) => {
          rows = rows.filter((r: any) => getPath(r, col) >= val);
          return builder;
        },
        lt: (col: string, val: string) => {
          rows = rows.filter((r: any) => getPath(r, col) < val);
          return builder;
        },
        order: () => builder,
        then: (resolve: any) => resolve({ data: rows, error: null }),
      };

      return builder;
    },
  } as any;
}

const routineExercises = [
  {
    routine_id: 'routine-1',
    exercise_id: 'bench',
    target_sets: 4,
    target_reps: 8,
    exercises: { id: 'bench', name: 'BENCH PRESS', muscle_group: 'PUSH', one_rm: 100 },
  },
  {
    routine_id: 'routine-1',
    exercise_id: 'row',
    target_sets: 3,
    target_reps: 10,
    exercises: { id: 'row', name: 'BARBELL ROW', muscle_group: 'PULL', one_rm: 80 },
  },
];

// "Now" is mid-August 2026, so August is the current month and July the
// previous one.
const NOW = new Date('2026-08-15T12:00:00Z');

const setLog = (exerciseId: string, weight: number, reps: number, loggedAt: string) => ({
  exercise_id: exerciseId,
  weight,
  completed_reps: reps,
  logged_at: loggedAt,
  workout_sessions: { user_id: 'user-1' },
});

describe('monthWindowsFor', () => {
  test('current month is [Aug 1, Sep 1) ART and previous is [Jul 1, Aug 1) ART', () => {
    const { current, previous } = monthWindowsFor(NOW);
    assert.equal(current.start.toISOString(), '2026-08-01T03:00:00.000Z');
    assert.equal(current.end.toISOString(), '2026-09-01T03:00:00.000Z');
    assert.equal(previous.start.toISOString(), '2026-07-01T03:00:00.000Z');
    assert.equal(previous.end.toISOString(), '2026-08-01T03:00:00.000Z');
  });

  test('crosses a year boundary in January', () => {
    const { current, previous } = monthWindowsFor(new Date('2026-01-15T12:00:00Z'));
    assert.equal(current.start.toISOString(), '2026-01-01T03:00:00.000Z');
    assert.equal(previous.start.toISOString(), '2025-12-01T03:00:00.000Z');
    assert.equal(previous.end.toISOString(), '2026-01-01T03:00:00.000Z');
  });
});

describe('getMonthlyOneRmComparison', () => {
  test('buckets a set logged right at the July/August ART boundary correctly', async () => {
    const db = stubDb({
      routine_exercises: routineExercises,
      set_logs: [
        // 2026-07-31T23:59:59.999 ART == 2026-08-01T02:59:59.999Z -> July.
        setLog('bench', 100, 1, '2026-08-01T02:59:59.999Z'),
        // 2026-08-01T00:00:00.000 ART == 2026-08-01T03:00:00.000Z -> August.
        setLog('bench', 110, 1, '2026-08-01T03:00:00.000Z'),
      ],
    });

    const result = await getMonthlyOneRmComparison(db, 'user-1', 'routine-1', NOW);
    const bench = result.find((r) => r.exerciseId === 'bench')!;

    assert.equal(bench.previousMonth, 100);
    assert.equal(bench.currentMonth, 110);
  });

  test('keeps only the max implied 1RM per exercise per month', async () => {
    const db = stubDb({
      routine_exercises: routineExercises,
      set_logs: [
        setLog('bench', 80, 5, '2026-08-05T15:00:00.000Z'),
        setLog('bench', 100, 1, '2026-08-10T15:00:00.000Z'), // heaviest
        setLog('bench', 90, 3, '2026-08-12T15:00:00.000Z'),
      ],
    });

    const result = await getMonthlyOneRmComparison(db, 'user-1', 'routine-1', NOW);
    const bench = result.find((r) => r.exerciseId === 'bench')!;

    assert.equal(bench.currentMonth, 100);
  });

  test('excludes sets logged for an exercise outside the given routine', async () => {
    const db = stubDb({
      routine_exercises: routineExercises,
      set_logs: [
        // Deadlift is not in routine-1.
        setLog('deadlift', 200, 1, '2026-08-05T15:00:00.000Z'),
      ],
    });

    const result = await getMonthlyOneRmComparison(db, 'user-1', 'routine-1', NOW);

    assert.deepEqual(result.map((r) => r.exerciseId).sort(), ['bench', 'row']);
    assert.equal(result.find((r) => r.exerciseId === 'deadlift'), undefined);
  });

  test('an exercise with no logged sets in a month still appears, as null', async () => {
    const db = stubDb({
      routine_exercises: routineExercises,
      set_logs: [],
    });

    const result = await getMonthlyOneRmComparison(db, 'user-1', 'routine-1', NOW);

    assert.equal(result.length, 2);
    result.forEach((r) => {
      assert.equal(r.previousMonth, null);
      assert.equal(r.currentMonth, null);
    });
  });
});
