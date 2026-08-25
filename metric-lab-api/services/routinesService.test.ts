import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRoutine,
  deleteRoutine,
  listRoutines,
  setRoutineExercises,
  updateRoutine,
} from './routinesService';
import { NotFoundError, ValidationError } from '../utils/errors';

// deleteRoutine reads routines and then deletes, all through the supabase query
// builder. This stub answers per table so a test can say "this routine exists"
// without a database.
function stubDb(
  tables: Record<string, any[]>,
  onDelete?: () => void,
  captured?: { rows: any[] }
) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      let insertedRow: any = null;

      const builder: any = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        upsert: (payload: any[]) => {
          if (captured) captured.rows = payload;
          return builder;
        },
        insert: (row: any) => {
          insertedRow = row;
          if (captured) captured.rows = [row];
          return builder;
        },
        update: (row: any) => {
          insertedRow = { ...(rows[0] ?? {}), ...row };
          if (captured) captured.rows = [row];
          return builder;
        },
        single: async () => ({ data: insertedRow, error: null }),
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
const MESOCYCLE = { id: 'meso-1', user_id: 'user-1', name: 'Block A' };

describe('deleteRoutine', () => {
  // The old 409 guard mirrored an ON DELETE RESTRICT foreign key from
  // migration 006. Migration 010 dropped mesocycles.routine_id and that key
  // with it: a mesocycle is user-scoped now, so deleting a routine cannot
  // destroy a training block and must not be refused.
  test('deletes a routine even while a mesocycle is running', async () => {
    let deleted = false;
    const db = stubDb({ routines: [ROUTINE], mesocycles: [MESOCYCLE] }, () => {
      deleted = true;
    });

    const result = await deleteRoutine(db, 'user-1', 'routine-1');

    assert.equal(deleted, true);
    assert.equal(result.deleted, 1);
  });

  test('deletes a routine when the user has no mesocycles at all', async () => {
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

describe('createRoutine', () => {
  test('persists name, type and description', async () => {
    const captured = { rows: [] as any[] };
    const db = stubDb({}, undefined, captured);

    await createRoutine(db, 'user-1', {
      name: 'Día de empuje',
      type: 'PUSH',
      description: 'Chest, shoulders, triceps',
    });

    assert.equal(captured.rows[0].name, 'Día de empuje');
    assert.equal(captured.rows[0].type, 'PUSH');
    assert.equal(captured.rows[0].description, 'Chest, shoulders, triceps');
    assert.equal(captured.rows[0].user_id, 'user-1');
  });

  test('stores a null type when none is given, without rejecting the routine', async () => {
    const captured = { rows: [] as any[] };
    const db = stubDb({}, undefined, captured);

    await createRoutine(db, 'user-1', { name: 'Custom day' });

    assert.equal(captured.rows[0].type, null);
  });

  test('stores a null description rather than an empty string', async () => {
    const captured = { rows: [] as any[] };
    const db = stubDb({}, undefined, captured);

    await createRoutine(db, 'user-1', { name: 'Custom day', description: '   ' });

    assert.equal(captured.rows[0].description, null);
  });

  test('rejects a routine with no name', async () => {
    const db = stubDb({});

    await assert.rejects(
      () => createRoutine(db, 'user-1', { type: 'PUSH' }),
      (error: any) => error instanceof ValidationError
    );
  });
});

describe('listRoutines', () => {
  test('flattens the membership count aggregate into exercise_count', async () => {
    const db = stubDb({
      routines: [
        { ...ROUTINE, type: 'PUSH', routine_exercises: [{ count: 3 }] },
        { id: 'routine-2', user_id: 'user-1', name: 'Legs', type: 'LEGS', routine_exercises: [] },
      ],
    });

    const routines = await listRoutines(db, 'user-1');

    assert.equal(routines[0].exercise_count, 3);
    assert.equal(routines[0].routine_exercises, undefined);
    // A routine with no members must report 0, not undefined: the card shows
    // the number verbatim.
    assert.equal(routines[1].exercise_count, 0);
  });
});

describe('updateRoutine', () => {
  test('renames a routine and retags its type', async () => {
    const captured = { rows: [] as any[] };
    const db = stubDb({ routines: [ROUTINE] }, undefined, captured);

    const updated = await updateRoutine(db, 'user-1', 'routine-1', {
      name: 'Push B',
      type: 'PUSH',
    });

    assert.equal(captured.rows[0].name, 'Push B');
    assert.equal(captured.rows[0].type, 'PUSH');
    assert.equal(updated.name, 'Push B');
  });

  test('clears the type when an empty string is sent', async () => {
    const captured = { rows: [] as any[] };
    const db = stubDb({ routines: [{ ...ROUTINE, type: 'PUSH' }] }, undefined, captured);

    await updateRoutine(db, 'user-1', 'routine-1', { type: '' });

    assert.equal(captured.rows[0].type, null);
  });

  test('leaves untouched fields out of the update instead of nulling them', async () => {
    const captured = { rows: [] as any[] };
    const db = stubDb({ routines: [{ ...ROUTINE, type: 'PUSH' }] }, undefined, captured);

    await updateRoutine(db, 'user-1', 'routine-1', { name: 'Push B' });

    assert.equal('type' in captured.rows[0], false);
    assert.equal('description' in captured.rows[0], false);
  });

  test('rejects a rename to an empty name', async () => {
    const db = stubDb({ routines: [ROUTINE] });

    await assert.rejects(
      () => updateRoutine(db, 'user-1', 'routine-1', { name: '   ' }),
      (error: any) => error instanceof ValidationError
    );
  });

  test('rejects an update with nothing to change', async () => {
    const db = stubDb({ routines: [ROUTINE] });

    await assert.rejects(
      () => updateRoutine(db, 'user-1', 'routine-1', {}),
      (error: any) => error instanceof ValidationError
    );
  });

  test('reports a routine that is not the caller\'s as not found', async () => {
    const db = stubDb({ routines: [] });

    await assert.rejects(
      () => updateRoutine(db, 'user-1', 'routine-1', { name: 'Push B' }),
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
