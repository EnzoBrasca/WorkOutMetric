import { useConfigStore } from '../useConfigStore';
import { useWorkoutStore } from '../useWorkoutStore';
import { useAuthStore } from '../useAuthStore';

const LIFTS = [
  {
    id: 'ex-1',
    name: 'Bench Press',
    type: 'push',
    value: '100',
    prev: '95',
    oneRm: 100,
    oneRmWeight: 100,
    oneRmReps: 1,
    isManual: true,
    historyValue: 90,
    recentValue: 90,
  },
  {
    id: 'ex-2',
    name: 'Squat',
    type: 'pull',
    value: '',
    prev: '',
    oneRm: null,
    oneRmWeight: null,
    oneRmReps: null,
    isManual: false,
    historyValue: null,
    recentValue: null,
  },
];

const WORKOUT_EXERCISES = [
  { id: 'ex-1', name: 'Bench Press', type: 'push', weight: '0.0', sets: '0x0', week: 'WK 1/4' },
  { id: 'ex-2', name: 'Squat', type: 'pull', weight: '0.0', sets: '0x0', week: 'WK 1/4' },
];

function resetStores() {
  useConfigStore.setState({
    lifts1rm: LIFTS.map((lift) => ({ ...lift })),
    isLoading: false,
    error: null,
    isCreatingExercise: false,
    estimatingIds: {},
    lowConfidenceByExerciseId: {},
  });
  useWorkoutStore.setState({
    exercises: WORKOUT_EXERCISES.map((ex) => ({ ...ex })),
    activeTab: 'push',
  });
  useAuthStore.setState({ isAuthenticated: true, user: { id: 'user-1' }, token: 'test-token' });
}

function okResponse(body) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => {
  resetStores();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useConfigStore.submitOneRmEstimate', () => {
  it('merges the estimate into the matching row and marks it manual', async () => {
    global.fetch.mockResolvedValue(
      okResponse({
        exercise: { id: 'ex-2', one_rm: 108, one_rm_weight: 90, one_rm_reps: 8 },
        lowConfidence: false,
      })
    );

    const result = await useConfigStore.getState().submitOneRmEstimate('ex-2', 90, 8);

    expect(result).toEqual({ success: true, lowConfidence: false });
    const lift = useConfigStore.getState().lifts1rm.find((l) => l.id === 'ex-2');
    expect(lift.oneRm).toBe(108);
    expect(lift.oneRmWeight).toBe(90);
    expect(lift.oneRmReps).toBe(8);
    expect(lift.isManual).toBe(true);
    expect(lift.value).toBe('108');
  });

  it('never touches historyValue/recentValue — a manual entry does not overwrite logged history', async () => {
    global.fetch.mockResolvedValue(
      okResponse({
        exercise: { id: 'ex-1', one_rm: 120, one_rm_weight: 100, one_rm_reps: 3 },
        lowConfidence: false,
      })
    );

    await useConfigStore.getState().submitOneRmEstimate('ex-1', 100, 3);

    const lift = useConfigStore.getState().lifts1rm.find((l) => l.id === 'ex-1');
    expect(lift.historyValue).toBe(90);
    expect(lift.recentValue).toBe(90);
  });

  it('records lowConfidence so the UI can warn without the value being rejected', async () => {
    // 100kg x 20 reps — Epley overestimates past RELIABLE_REP_LIMIT; the API
    // still accepts and returns the number, just flagged.
    global.fetch.mockResolvedValue(
      okResponse({
        exercise: { id: 'ex-2', one_rm: 166.5, one_rm_weight: 100, one_rm_reps: 20 },
        lowConfidence: true,
      })
    );

    const result = await useConfigStore.getState().submitOneRmEstimate('ex-2', 100, 20);

    expect(result.lowConfidence).toBe(true);
    expect(useConfigStore.getState().lowConfidenceByExerciseId['ex-2']).toBe(true);
    expect(useConfigStore.getState().lifts1rm.find((l) => l.id === 'ex-2').oneRm).toBe(166.5);
  });

  it('leaves the list untouched and surfaces the error when the request fails', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'weight must be a positive number' }),
    });
    const before = useConfigStore.getState().lifts1rm;

    const result = await useConfigStore.getState().submitOneRmEstimate('ex-2', -5, 8);

    expect(result.success).toBe(false);
    expect(useConfigStore.getState().lifts1rm).toEqual(before);
    expect(useConfigStore.getState().error).toBe('weight must be a positive number');
  });

  it('marks the row as estimating while the request is in flight and clears it after', async () => {
    global.fetch.mockResolvedValue(
      okResponse({
        exercise: { id: 'ex-2', one_rm: 100, one_rm_weight: 90, one_rm_reps: 8 },
        lowConfidence: false,
      })
    );

    const promise = useConfigStore.getState().submitOneRmEstimate('ex-2', 90, 8);
    expect(useConfigStore.getState().estimatingIds['ex-2']).toBe(true);

    await promise;
    expect(useConfigStore.getState().estimatingIds['ex-2']).toBe(false);
  });
});

describe('useConfigStore.createExercise', () => {
  it('creates the exercise through useWorkoutStore with the given type and appends a fresh catalog row', async () => {
    global.fetch.mockResolvedValue(okResponse({}));

    const result = await useConfigStore.getState().createExercise('Deadlift', 'pull');

    expect(result.success).toBe(true);
    expect(result.exercise.name).toBe('Deadlift');
    expect(result.exercise.type).toBe('pull');

    const workoutExercise = useWorkoutStore
      .getState()
      .exercises.find((ex) => ex.name === 'Deadlift');
    expect(workoutExercise.type).toBe('pull');

    const catalogRow = useConfigStore.getState().lifts1rm.find((l) => l.name === 'Deadlift');
    expect(catalogRow).toMatchObject({ oneRm: null, isManual: false, historyValue: null });
  });

  it('rejects an empty name without touching the network', async () => {
    const result = await useConfigStore.getState().createExercise('   ', 'push');

    expect(result.success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(useConfigStore.getState().lifts1rm).toHaveLength(2);
  });
});

describe('useConfigStore.renameExercise', () => {
  it('updates the name in both the catalog cache and useWorkoutStore', () => {
    useConfigStore.getState().renameExercise('ex-1', '  Incline Bench  ');

    expect(useConfigStore.getState().lifts1rm.find((l) => l.id === 'ex-1').name).toBe(
      'Incline Bench'
    );
    expect(useWorkoutStore.getState().exercises.find((ex) => ex.id === 'ex-1').name).toBe(
      'Incline Bench'
    );
  });

  it('rejects an empty name', () => {
    const result = useConfigStore.getState().renameExercise('ex-1', '   ');

    expect(result.success).toBe(false);
    expect(useConfigStore.getState().lifts1rm.find((l) => l.id === 'ex-1').name).toBe(
      'Bench Press'
    );
  });
});

describe('useConfigStore.deleteExercise', () => {
  it('removes the exercise from the catalog immediately (optimistic)', () => {
    global.fetch.mockReturnValue(new Promise(() => {}));

    useConfigStore.getState().deleteExercise('ex-1');

    expect(useConfigStore.getState().lifts1rm.map((l) => l.id)).toEqual(['ex-2']);
  });

  it('keeps it removed once the underlying delete succeeds', async () => {
    global.fetch.mockResolvedValue(okResponse({}));

    const result = await useConfigStore.getState().deleteExercise('ex-1');

    expect(result.success).toBe(true);
    expect(useConfigStore.getState().lifts1rm.map((l) => l.id)).toEqual(['ex-2']);
  });

  it('restores the row at its original position when useWorkoutStore rolls the delete back', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    const result = await useConfigStore.getState().deleteExercise('ex-1');

    expect(result.success).toBe(false);
    expect(useConfigStore.getState().lifts1rm.map((l) => l.id)).toEqual(['ex-1', 'ex-2']);
    expect(useConfigStore.getState().lifts1rm[0]).toEqual(LIFTS[0]);
  });
});
