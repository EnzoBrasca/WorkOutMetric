import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  SessionLike,
  sessionVolume,
  setLogVolume,
  summarizeHistory,
  summarizeSession,
} from './sessionMetrics';

describe('setLogVolume', () => {
  test('multiplies sets, reps and weight', () => {
    assert.equal(setLogVolume({ completed_sets: 4, completed_reps: 8, weight: 85 }), 2720);
  });

  test('treats a missing weight as zero rather than NaN', () => {
    assert.equal(setLogVolume({ completed_sets: 3, completed_reps: 10, weight: null }), 0);
    assert.equal(setLogVolume({ completed_sets: 3, completed_reps: 10 }), 0);
  });

  test('accepts the numeric strings postgrest returns for DECIMAL columns', () => {
    assert.equal(setLogVolume({ completed_sets: '3', completed_reps: '10', weight: '52.5' }), 1575);
  });

  test('does not let unparseable input poison the total', () => {
    assert.equal(setLogVolume({ completed_sets: 'AMRAP', completed_reps: 10, weight: 50 }), 0);
  });
});

describe('sessionVolume', () => {
  test('sums every log in the session', () => {
    const volume = sessionVolume([
      { completed_sets: 4, completed_reps: 8, weight: 85 }, // 2720
      { completed_sets: 3, completed_reps: 10, weight: 60 }, // 1800
    ]);

    assert.equal(volume, 4520);
  });

  test('is zero for a session with no logs', () => {
    assert.equal(sessionVolume([]), 0);
    assert.equal(sessionVolume(null), 0);
    assert.equal(sessionVolume(undefined), 0);
  });
});

describe('summarizeSession', () => {
  const session: SessionLike = {
    id: 'session-1',
    started_at: '2026-08-23T10:00:00.000Z',
    ended_at: '2026-08-23T11:15:00.000Z',
    mesocycle_id: 'meso-1',
    mesocycle_week: 2,
    set_logs: [
      { exercise_id: 'squat', completed_sets: 4, completed_reps: 8, weight: 85 },
      { exercise_id: 'bench', completed_sets: 3, completed_reps: 10, weight: 60 },
    ],
  };

  test('totals sets, reps and volume across exercises', () => {
    const summary = summarizeSession(session);

    assert.equal(summary.totalSets, 7);
    assert.equal(summary.totalReps, 62); // 4*8 + 3*10
    assert.equal(summary.totalVolume, 4520);
    assert.equal(summary.exerciseCount, 2);
  });

  test('carries the mesocycle context the numbers came from', () => {
    const summary = summarizeSession(session);

    assert.equal(summary.mesocycleId, 'meso-1');
    assert.equal(summary.mesocycleWeek, 2);
  });

  test('computes duration in minutes', () => {
    assert.equal(summarizeSession(session).durationMinutes, 75);
  });

  test('leaves duration null while the session is still open', () => {
    const open = { ...session, ended_at: null };
    assert.equal(summarizeSession(open).durationMinutes, null);
  });

  test('counts distinct exercises, not log rows', () => {
    const repeated = {
      ...session,
      set_logs: [
        { exercise_id: 'squat', completed_sets: 2, completed_reps: 5, weight: 100 },
        { exercise_id: 'squat', completed_sets: 2, completed_reps: 5, weight: 100 },
      ],
    };

    assert.equal(summarizeSession(repeated).exerciseCount, 1);
  });

  test('handles a session with no logs', () => {
    const empty = { ...session, set_logs: [] };
    const summary = summarizeSession(empty);

    assert.equal(summary.totalVolume, 0);
    assert.equal(summary.totalSets, 0);
    assert.equal(summary.exerciseCount, 0);
  });
});

describe('summarizeHistory', () => {
  // Newest first, the order the repository returns.
  const sessions: SessionLike[] = [
    { id: 'c', set_logs: [{ completed_sets: 1, completed_reps: 1, weight: 110 }] },
    { id: 'b', set_logs: [{ completed_sets: 1, completed_reps: 1, weight: 100 }] },
    { id: 'a', set_logs: [{ completed_sets: 1, completed_reps: 1, weight: 80 }] },
  ];

  test('compares each session against the older one before it', () => {
    const history = summarizeHistory(sessions);

    assert.equal(history[0].volumeDeltaPct, 10); // 110 vs 100
    assert.equal(history[1].volumeDeltaPct, 25); // 100 vs 80
  });

  test('reports a drop as a negative delta', () => {
    const declining = summarizeHistory([
      { id: 'new', set_logs: [{ completed_sets: 1, completed_reps: 1, weight: 90 }] },
      { id: 'old', set_logs: [{ completed_sets: 1, completed_reps: 1, weight: 100 }] },
    ]);

    assert.equal(declining[0].volumeDeltaPct, -10);
  });

  test('leaves the oldest session without a delta instead of inventing 0%', () => {
    const history = summarizeHistory(sessions);
    assert.equal(history[history.length - 1].volumeDeltaPct, null);
  });

  test('does not divide by zero when the previous session logged nothing', () => {
    const history = summarizeHistory([
      { id: 'new', set_logs: [{ completed_sets: 3, completed_reps: 10, weight: 50 }] },
      { id: 'empty', set_logs: [] },
    ]);

    assert.equal(history[0].volumeDeltaPct, null);
    assert.ok(Number.isFinite(history[0].totalVolume));
  });

  test('rounds the delta to one decimal place', () => {
    const history = summarizeHistory([
      { id: 'new', set_logs: [{ completed_sets: 1, completed_reps: 1, weight: 103 }] },
      { id: 'old', set_logs: [{ completed_sets: 1, completed_reps: 1, weight: 97 }] },
    ]);

    assert.equal(history[0].volumeDeltaPct, 6.2); // 6.1855...
  });

  test('returns an empty list unchanged', () => {
    assert.deepEqual(summarizeHistory([]), []);
  });
});
