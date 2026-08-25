import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMesocycle,
  getWeekPlan,
  listMesocycles,
  setWeek,
  toPlannedInputs,
} from './mesocyclesService';
import { ValidationError } from '../utils/errors';

// Same shape as routinesService.test.ts: one stub answering per table, so the
// service can be exercised without a database.
function stubDb(tables: Record<string, any[]>, captured?: { rows: any[] }) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      let written: any = null;

      const builder: any = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        insert: (row: any) => {
          written = row;
          if (captured) captured.rows = [row];
          return builder;
        },
        update: (row: any) => {
          written = { ...(rows[0] ?? {}), ...row };
          if (captured) captured.rows = [row];
          return builder;
        },
        delete: () => builder,
        single: async () => ({ data: written, error: null }),
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        then: (resolve: any) => resolve({ data: written ? [written] : rows, error: null }),
      };

      return builder;
    },
  } as any;
}

const MESOCYCLE = {
  id: 'meso-1',
  user_id: 'user-1',
  name: 'BLOCK A',
  total_weeks: 4,
  start_pct: 60,
  increment_pct: 10,
  deload_enabled: false,
  deload_week: null,
  deload_pct: 50,
  week_anchor_week: 1,
  week_anchor_monday: '2026-08-24',
};

// Wednesday of the anchor week, and the Monday two weeks later.
const IN_ANCHOR_WEEK = new Date('2026-08-26T12:00:00Z');
const TWO_WEEKS_ON = new Date('2026-09-07T12:00:00Z');

describe('createMesocycle', () => {
  test('requires a name now that there is no routine to borrow one from', async () => {
    const db = stubDb({ mesocycles: [] });

    await assert.rejects(
      () => createMesocycle(db, 'user-1', { total_weeks: 4 }),
      (error: any) => error instanceof ValidationError
    );

    await assert.rejects(
      () => createMesocycle(db, 'user-1', { name: '   ' }),
      (error: any) => error instanceof ValidationError
    );
  });

  test('never writes routine_id, and anchors week 1 to the current ART Monday', async () => {
    const captured = { rows: [] as any[] };
    const db = stubDb({ mesocycles: [] }, captured);

    const created = await createMesocycle(
      db,
      'user-1',
      { name: '  HYPERTROPHY BLOCK  ' },
      IN_ANCHOR_WEEK
    );

    const row = captured.rows[0];
    assert.equal(row.name, 'HYPERTROPHY BLOCK');
    assert.equal('routine_id' in row, false);
    assert.equal('current_week' in row, false);
    assert.equal(row.week_anchor_week, 1);
    assert.equal(row.week_anchor_monday, '2026-08-24');
    // The derived week rides back out on the response so the client never has
    // to know the anchor exists.
    assert.equal(created.current_week, 1);
  });
});

describe('toPlannedInputs', () => {
  const row = (routineId: string, exerciseId: string, sets: number, oneRm: number | null) => ({
    routine_id: routineId,
    exercise_id: exerciseId,
    target_sets: sets,
    target_reps: 8,
    exercises: { id: exerciseId, name: exerciseId.toUpperCase(), one_rm: oneRm },
  });

  test('plans an exercise shared by two routines exactly once', () => {
    const planned = toPlannedInputs([
      row('routine-push', 'bench', 4, 100),
      row('routine-upper', 'bench', 3, 100),
      row('routine-legs', 'squat', 5, 140),
    ]);

    assert.equal(planned.length, 2);
    const bench = planned.find((p) => p.exercise_id === 'bench')!;
    assert.deepEqual(bench.routine_ids, ['routine-push', 'routine-upper']);
    // First row wins the set count; the routines disagreeing is not the plan's
    // problem to arbitrate.
    assert.equal(bench.target_sets, 4);
  });

  test('accepts the embedded exercise as an array as well as an object', () => {
    const planned = toPlannedInputs([
      { routine_id: 'r1', exercise_id: 'ex-1', target_sets: 3, exercises: [{ name: 'ROW', one_rm: 80 }] },
    ]);

    assert.equal(planned[0].name, 'ROW');
    assert.equal(planned[0].one_rm, 80);
  });

  test('keeps a missing 1RM as null rather than zero', () => {
    const planned = toPlannedInputs([row('r1', 'ex-1', 3, null)]);
    assert.equal(planned[0].one_rm, null);
  });
});

describe('getWeekPlan', () => {
  const membership = [
    {
      routine_id: 'routine-push',
      exercise_id: 'bench',
      target_sets: 3,
      target_reps: 8,
      exercises: { id: 'bench', name: 'BENCH PRESS', one_rm: 100 },
    },
    {
      routine_id: 'routine-legs',
      exercise_id: 'squat',
      target_sets: 4,
      target_reps: 8,
      exercises: { id: 'squat', name: 'SQUAT', one_rm: 140 },
    },
  ];

  test('covers exercises from EVERY routine, not just one', async () => {
    const db = stubDb({ mesocycles: [MESOCYCLE], routine_exercises: membership });

    const { plan } = await getWeekPlan(db, 'user-1', 'meso-1', undefined, IN_ANCHOR_WEEK);

    assert.deepEqual(
      plan.exercises.map((e) => e.exerciseId).sort(),
      ['bench', 'squat']
    );
    assert.deepEqual(plan.exercises[0].routineIds, ['routine-push']);
  });

  test('defaults to the week derived from the anchor, not to a stored counter', async () => {
    const db = stubDb({ mesocycles: [MESOCYCLE], routine_exercises: membership });

    const inAnchorWeek = await getWeekPlan(db, 'user-1', 'meso-1', undefined, IN_ANCHOR_WEEK);
    assert.equal(inAnchorWeek.plan.week, 1);
    assert.equal(inAnchorWeek.plan.percent, 60);
    assert.equal(inAnchorWeek.mesocycle.current_week, 1);

    const later = await getWeekPlan(db, 'user-1', 'meso-1', undefined, TWO_WEEKS_ON);
    assert.equal(later.plan.week, 3);
    // Two ramp steps on: 60 -> 70 -> 80.
    assert.equal(later.plan.percent, 80);
    assert.equal(later.mesocycle.current_week, 3);
  });

  test('rejects a requested week outside the block', async () => {
    const db = stubDb({ mesocycles: [MESOCYCLE], routine_exercises: membership });

    await assert.rejects(
      () => getWeekPlan(db, 'user-1', 'meso-1', 9, IN_ANCHOR_WEEK),
      (error: any) => error instanceof ValidationError
    );
  });
});

describe('setWeek', () => {
  test('re-anchors instead of writing a week number', async () => {
    const captured = { rows: [] as any[] };
    const db = stubDb({ mesocycles: [MESOCYCLE] }, captured);

    const updated = await setWeek(db, 'user-1', 'meso-1', 3, TWO_WEEKS_ON);

    assert.deepEqual(captured.rows[0], {
      week_anchor_week: 3,
      week_anchor_monday: '2026-09-07',
    });
    assert.equal(updated.current_week, 3);
  });

  test('auto-advance resumes from a manually set week the following Monday', async () => {
    const captured = { rows: [] as any[] };
    const db = stubDb({ mesocycles: [MESOCYCLE] }, captured);

    await setWeek(db, 'user-1', 'meso-1', 3, TWO_WEEKS_ON);

    const reanchored = { ...MESOCYCLE, ...captured.rows[0] };
    const nextDb = stubDb({ mesocycles: [reanchored] });
    const [row] = await listMesocycles(nextDb, 'user-1', new Date('2026-09-14T03:00:00Z'));

    assert.equal(row.current_week, 4);
  });

  test('refuses a week outside the block', async () => {
    const db = stubDb({ mesocycles: [MESOCYCLE] });

    await assert.rejects(
      () => setWeek(db, 'user-1', 'meso-1', 0, IN_ANCHOR_WEEK),
      (error: any) => error instanceof ValidationError
    );
    await assert.rejects(
      () => setWeek(db, 'user-1', 'meso-1', 5, IN_ANCHOR_WEEK),
      (error: any) => error instanceof ValidationError
    );
  });
});

describe('listMesocycles', () => {
  test('decorates every row with its derived week', async () => {
    const db = stubDb({
      mesocycles: [MESOCYCLE, { ...MESOCYCLE, id: 'meso-2', week_anchor_week: 2 }],
    });

    const rows = await listMesocycles(db, 'user-1', TWO_WEEKS_ON);

    assert.deepEqual(rows.map((r: any) => r.current_week), [3, 4]);
  });
});
