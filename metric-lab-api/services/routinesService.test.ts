import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { deleteRoutine, setRoutineExercises } from './routinesService';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

// deleteRoutine reads routines/mesocycles and then deletes, all through the
// supabase query builder. This stub answers per table so a test can say
// "this routine exists and has a mesocycle" without a database.
function stubDb(
  tables: Record<string, any[]>,
  onDelete?: () => void,
  captured?: { rows: any[] }
) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];

      const builder: any = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        upsert: (payload: any[]) => {
          if (captured) captured.rows = payload;
          return builder;
        },
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        delete: () => {
          onDelete?.();
          return builder;
        },
        then: undefined,
      };

      // `.select()` at the end of a delete resolves to the deleted rows; the
      // repository awaits the builder itself for plain selects.
      builder.then = (resolve: any) => resolve({ data: rows, error: null });

      return builder;
    },
  } as any;
}

const ROUTINE = { id: 'routine-1', user_id: 'user-1', name: 'Push A' };
const MESOCYCLE = { id: 'meso-1', user_id: 'user-1', routine_id: 'routine-1' };

describe('deleteRoutine', () => {
  test('refuses to delete a routine a mesocycle still depends on', async () => {
    let deleted = false;
    const db = stubDb({ routines: [ROUTINE], mesocycles: [MESOCYCLE] }, () => {
      deleted = true;
    });

    await assert.rejects(
      () => deleteRoutine(db, 'user-1', 'routine-1'),
      (error: any) => {
        assert.ok(error instanceof ConflictError);
        assert.equal(error.status, 409);
        return true;
      }
    );

    assert.equal(deleted, false, 'the delete must not reach the database');
  });

  test('deletes a routine no mesocycle points at', async () => {
    const db = stubDb({ routines: [ROUTINE], mesocycles: [] });

    const result = await deleteRoutine(db, 'user-1', 'routine-1');

    assert.equal(result.deleted, 1);
  });

  test('reports a routine that is not the caller\'s as not found', async () => {
    const db = stubDb({ routines: [], mesocycles: [] });

    await assert.rejects(
      () => deleteRoutine(db, 'user-1', 'routine-1'),
      (error: any) => error instanceof NotFoundError
    );
  });
});

describe('setRoutineExercises target validation', () => {
  const db = () => stubDb({ routines: [ROUTINE], routine_exercises: [] });

  test('rejects zero target sets rather than storing a plan of nothing', async () => {
    await assert.rejects(
      () =>
        setRoutineExercises(db(), 'user-1', 'routine-1', [
          { exercise_id: 'squat', target_sets: 0, target_reps: 8 },
        ]),
      (error: any) => error instanceof ValidationError
    );
  });

  test('rejects negative target reps', async () => {
    await assert.rejects(
      () =>
        setRoutineExercises(db(), 'user-1', 'routine-1', [
          { exercise_id: 'squat', target_sets: 3, target_reps: -8 },
        ]),
      (error: any) => error instanceof ValidationError
    );
  });

  test('falls back to the routine defaults when a target is absent', async () => {
    const captured = { rows: [] as any[] };
    const stub = stubDb({ routines: [ROUTINE], routine_exercises: [] }, undefined, captured);

    await setRoutineExercises(stub, 'user-1', 'routine-1', [{ exercise_id: 'squat' }]);

    assert.equal(captured.rows[0].target_sets, 3);
    assert.equal(captured.rows[0].target_reps, 8);
  });

  test('keeps valid targets untouched', async () => {
    const captured = { rows: [] as any[] };
    const stub = stubDb({ routines: [ROUTINE], routine_exercises: [] }, undefined, captured);

    await setRoutineExercises(stub, 'user-1', 'routine-1', [
      { exercise_id: 'squat', target_sets: 4, target_reps: 6 },
    ]);

    assert.equal(captured.rows[0].target_sets, 4);
    assert.equal(captured.rows[0].target_reps, 6);
  });
});
