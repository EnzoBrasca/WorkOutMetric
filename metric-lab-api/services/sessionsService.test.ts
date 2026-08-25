import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { logSet, startSession } from './sessionsService';
import { ValidationError } from '../utils/errors';

// Same shape of stub as routinesService.test.ts: answer per table so a test can
// describe the database state it needs without one.
function stubDb(tables: Record<string, any[]>, captured?: { rows: any[] }) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];

      const builder: any = {
        select: () => builder,
        insert: (payload: any[]) => {
          if (captured) captured.rows = payload;
          return builder;
        },
        update: () => builder,
        delete: () => builder,
        eq: () => builder,
        is: () => builder,
        not: () => builder,
        order: () => builder,
        range: () => builder,
        limit: () => builder,
        single: async () => ({ data: rows[0] ?? null, error: null }),
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      };

      builder.then = (resolve: any) => resolve({ data: rows, error: null });
      return builder;
    },
  } as any;
}

const OPEN_SESSION = { id: 'session-1', user_id: 'user-1', ended_at: null };
const FOUR_WEEK_BLOCK = {
  id: 'meso-1',
  user_id: 'user-1',
  name: 'Block A',
  total_weeks: 4,
};

describe('startSession mesocycle_week validation', () => {
  test('rejects a week past the end of the mesocycle', async () => {
    const db = stubDb({
      workout_sessions: [],
      routines: [],
      mesocycles: [FOUR_WEEK_BLOCK],
    });

    await assert.rejects(
      () => startSession(db, 'user-1', { mesocycle_id: 'meso-1', mesocycle_week: 37 }),
      (error: any) => {
        assert.ok(error instanceof ValidationError);
        assert.match(error.message, /1-4/);
        return true;
      }
    );
  });

  test('rejects week 0', async () => {
    const db = stubDb({
      workout_sessions: [],
      routines: [],
      mesocycles: [FOUR_WEEK_BLOCK],
    });

    await assert.rejects(
      () => startSession(db, 'user-1', { mesocycle_id: 'meso-1', mesocycle_week: 0 }),
      (error: any) => error instanceof ValidationError
    );
  });

  test('accepts a week inside the block', async () => {
    const db = stubDb({
      workout_sessions: [],
      routines: [],
      mesocycles: [FOUR_WEEK_BLOCK],
    });

    const { resumed } = await startSession(db, 'user-1', {
      mesocycle_id: 'meso-1',
      mesocycle_week: 3,
    });

    assert.equal(resumed, false);
  });

  test('still rejects a non-integer week when no mesocycle is attached', async () => {
    const db = stubDb({ workout_sessions: [], routines: [], mesocycles: [] });

    await assert.rejects(
      () => startSession(db, 'user-1', { mesocycle_week: 'three' }),
      (error: any) => error instanceof ValidationError
    );
  });
});

describe('startSession double-tap race', () => {
  // Both requests see no open session, both insert, and the partial unique
  // index (migrations/004) rejects the loser. This stub reproduces exactly
  // that: the first lookup finds nothing, the insert violates the constraint,
  // and by the time we look again the winner's session is there.
  function racingDb(winner: any) {
    let lookups = 0;

    return {
      from() {
        const builder: any = {
          select: () => builder,
          insert: () => builder,
          eq: () => builder,
          is: () => builder,
          order: () => builder,
          limit: () => builder,
          single: async () => ({
            data: null,
            error: { code: '23505', message: 'duplicate key value' },
          }),
          maybeSingle: async () => {
            lookups += 1;
            return { data: lookups === 1 ? null : winner, error: null };
          },
        };

        builder.then = (resolve: any) => resolve({ data: [], error: null });
        return builder;
      },
    } as any;
  }

  test('returns the session that won the race instead of failing', async () => {
    const winner = { id: 'session-winner', user_id: 'user-1', ended_at: null };

    const { session, resumed } = await startSession(racingDb(winner), 'user-1', {});

    assert.equal(session.id, 'session-winner');
    assert.equal(resumed, true);
  });
});

describe('logSet range validation', () => {
  const tables = { workout_sessions: [OPEN_SESSION], set_logs: [] };

  test('rejects negative reps instead of letting them poison the metrics', async () => {
    await assert.rejects(
      () =>
        logSet(stubDb(tables), 'user-1', 'session-1', {
          exercise_id: 'squat',
          completed_sets: 3,
          completed_reps: -5,
        }),
      (error: any) => error instanceof ValidationError
    );
  });

  test('rejects negative sets', async () => {
    await assert.rejects(
      () =>
        logSet(stubDb(tables), 'user-1', 'session-1', {
          exercise_id: 'squat',
          completed_sets: -1,
          completed_reps: 8,
        }),
      (error: any) => error instanceof ValidationError
    );
  });

  test('rejects a negative weight', async () => {
    await assert.rejects(
      () =>
        logSet(stubDb(tables), 'user-1', 'session-1', {
          exercise_id: 'squat',
          completed_sets: 3,
          completed_reps: 8,
          weight: -20,
        }),
      (error: any) => error instanceof ValidationError
    );
  });

  test('still accepts an unknown weight as null', async () => {
    const captured = { rows: [] as any[] };
    await logSet(stubDb(tables, captured), 'user-1', 'session-1', {
      exercise_id: 'squat',
      completed_sets: 3,
      completed_reps: 8,
    });

    assert.equal(captured.rows[0].weight, null);
  });

  test('accepts a normal set', async () => {
    const captured = { rows: [] as any[] };
    await logSet(stubDb(tables, captured), 'user-1', 'session-1', {
      exercise_id: 'squat',
      completed_sets: 4,
      completed_reps: 8,
      weight: 85,
    });

    assert.equal(captured.rows[0].completed_reps, 8);
    assert.equal(captured.rows[0].weight, 85);
  });
});
