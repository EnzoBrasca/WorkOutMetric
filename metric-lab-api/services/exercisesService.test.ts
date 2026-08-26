import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { deleteExercise, syncExercises, normalizeEquipment, normalizeEquipmentUnits } from './exercisesService';

// syncExercises only reaches the database through exercisesRepository.upsertMany,
// which forwards straight to db.from('exercises').upsert(rows). Capturing that
// argument is enough to assert the shape of the payload postgrest-js receives.
function captureUpsert() {
  const captured: { rows: any[] } = { rows: [] };

  const db = {
    from() {
      return {
        upsert(rows: any[]) {
          captured.rows = rows;
          return { select: async () => ({ data: rows, error: null }) };
        },
      };
    },
  };

  return { db: db as any, captured };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('syncExercises', () => {
  test('gives every row an id so postgrest never writes an explicit null over one', async () => {
    const { db, captured } = captureUpsert();

    await syncExercises(db, 'user-1', [
      { id: '11111111-1111-4111-8111-111111111111', name: 'Squat', type: 'PUSH' },
      { name: 'Brand new lift', type: 'PULL' },
    ]);

    assert.equal(captured.rows.length, 2);
    for (const row of captured.rows) {
      assert.ok(typeof row.id === 'string', 'every row must carry an id key');
      assert.match(row.id, UUID);
    }
  });

  test('keeps the id the client sent for an existing exercise', async () => {
    const { db, captured } = captureUpsert();
    const existing = '22222222-2222-4222-8222-222222222222';

    await syncExercises(db, 'user-1', [{ id: existing, name: 'Bench' }]);

    assert.equal(captured.rows[0].id, existing);
  });

  test('ignores a non-uuid id from the client instead of upserting onto it', async () => {
    const { db, captured } = captureUpsert();

    await syncExercises(db, 'user-1', [{ id: 'local-42', name: 'Row' }]);

    assert.notEqual(captured.rows[0].id, 'local-42');
    assert.match(captured.rows[0].id, UUID);
  });

  test('no longer pins base_weight to zero on every sync', async () => {
    const { db, captured } = captureUpsert();

    await syncExercises(db, 'user-1', [{ name: 'Deadlift' }]);

    assert.ok(
      !('base_weight' in captured.rows[0]),
      'base_weight must not be written: nothing reads it and the write was destructive'
    );
  });

  test('scopes every row to the caller', async () => {
    const { db, captured } = captureUpsert();

    await syncExercises(db, 'user-1', [{ name: 'A' }, { name: 'B' }]);

    assert.deepEqual(
      captured.rows.map((r) => r.user_id),
      ['user-1', 'user-1']
    );
  });
});

describe('deleteExercise', () => {
  // Captures whether the repository reached for .delete() or .update(), which
  // is the whole point: a real DELETE cascades into set_logs and destroys the
  // user's logged history.
  function captureRemoval(affectedRows: any[]) {
    const seen = { hardDeleted: false, patch: null as any };

    const db = {
      from() {
        const builder: any = {
          delete: () => {
            seen.hardDeleted = true;
            return builder;
          },
          update: (patch: any) => {
            seen.patch = patch;
            return builder;
          },
          eq: () => builder,
          is: () => builder,
          select: async () => ({ data: affectedRows, error: null }),
        };
        return builder;
      },
    };

    return { db: db as any, seen };
  }

  test('marks the exercise deleted instead of destroying its history', async () => {
    const { db, seen } = captureRemoval([{ id: 'ex-1' }]);

    const result = await deleteExercise(db, 'user-1', 'ex-1');

    assert.equal(seen.hardDeleted, false, 'must never issue a real DELETE');
    assert.ok(seen.patch?.deleted_at, 'must stamp deleted_at');
    assert.equal(result.deleted, 1);
  });

  test('reports zero when the exercise was already deleted', async () => {
    const { db } = captureRemoval([]);

    const result = await deleteExercise(db, 'user-1', 'ex-1');

    assert.equal(result.deleted, 0);
  });
});

describe('normalizeEquipment', () => {
  test('keeps a tag, uppercased and trimmed', () => {
    assert.equal(normalizeEquipment('dumbbell'), 'DUMBBELL');
    assert.equal(normalizeEquipment('  CABLE '), 'CABLE');
  });

  // Every exercise that predates this feature arrives with no tag and must
  // stay that way — null is what renders as a plain total weight.
  test('leaves an untagged exercise untagged', () => {
    assert.equal(normalizeEquipment(null), null);
    assert.equal(normalizeEquipment(undefined), null);
    assert.equal(normalizeEquipment(''), null);
    assert.equal(normalizeEquipment('   '), null);
    assert.equal(normalizeEquipment(42), null);
  });
});

describe('normalizeEquipmentUnits', () => {
  test('allows two only for equipment a load can split across', () => {
    assert.equal(normalizeEquipmentUnits('DUMBBELL', 2), 2);
    assert.equal(normalizeEquipmentUnits('CABLE', 2), 2);
    assert.equal(normalizeEquipmentUnits('DUMBBELL', 1), 1);
  });

  test('pins single-implement equipment to one unit', () => {
    assert.equal(normalizeEquipmentUnits('BARBELL', 2), 1);
    assert.equal(normalizeEquipmentUnits('SMITH', 2), 1);
    assert.equal(normalizeEquipmentUnits('OTHER', 2), 1);
    assert.equal(normalizeEquipmentUnits(null, 2), 1);
  });

  // The column's CHECK only accepts 1 or 2, so anything else is forced back
  // here rather than sent to be rejected by the database.
  test('forces an out-of-range count back to one', () => {
    assert.equal(normalizeEquipmentUnits('DUMBBELL', 3), 1);
    assert.equal(normalizeEquipmentUnits('DUMBBELL', 0), 1);
    assert.equal(normalizeEquipmentUnits('DUMBBELL', null), 1);
    assert.equal(normalizeEquipmentUnits('DUMBBELL', 'dos'), 1);
  });
});

describe('syncExercises equipment columns', () => {
  // postgrest-js normalises the column set across upserted rows: if one row
  // omitted equipment while another carried it, the omitting row would get an
  // explicit NULL written over its own value.
  test('sends equipment columns on every row, tagged or not', async () => {
    const { db, captured } = captureUpsert();

    await syncExercises(db as any, 'user-1', [
      { id: 'a'.repeat(36), name: 'Press banca', equipment: 'BARBELL' },
      { id: 'b'.repeat(36), name: 'Curl', equipment: 'dumbbell', equipment_units: 2 },
      { id: 'c'.repeat(36), name: 'Sin tag' },
    ]);

    captured.rows.forEach((row) => {
      assert.ok('equipment' in row, 'every row must carry equipment');
      assert.ok('equipment_units' in row, 'every row must carry equipment_units');
    });

    assert.equal(captured.rows[0].equipment, 'BARBELL');
    assert.equal(captured.rows[0].equipment_units, 1);
    assert.equal(captured.rows[1].equipment, 'DUMBBELL');
    assert.equal(captured.rows[1].equipment_units, 2);
    assert.equal(captured.rows[2].equipment, null);
    assert.equal(captured.rows[2].equipment_units, 1);
  });
});
