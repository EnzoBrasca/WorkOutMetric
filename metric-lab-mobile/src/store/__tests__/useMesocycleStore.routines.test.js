import { useMesocycleStore } from '../useMesocycleStore';
import { useAuthStore } from '../useAuthStore';

// Covers the Train-tab-to-routine resolution the rework introduced: the
// migration seeds one routine per user per muscle_group, named
// UPPER(muscle_group), so the PUSH/PULL tabs have to resolve to real routines
// by name instead of filtering exercises by ex.type.

const PUSH_ROUTINE = { id: 'routine-push', name: 'PUSH', user_id: 'user-1' };

function resetStore() {
  useMesocycleStore.setState({
    mesocycles: [],
    activeMesocycleId: null,
    routines: [{ ...PUSH_ROUTINE }],
    activeRoutineDetail: null,
    plan: null,
    isLoading: false,
    isSavingRoutine: false,
    isPlanLoading: false,
    isSettingOneRm: false,
    isLoadingRoutineDetail: false,
    error: null,
  });
  useAuthStore.setState({ isAuthenticated: true, user: { id: 'user-1' }, token: 'test-token' });
}

function okResponse(body) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => {
  resetStore();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useMesocycleStore.loadRoutineForTab', () => {
  it('resolves the tab to the UPPER(tab)-named routine and loads its membership', async () => {
    const routineDetail = {
      id: 'routine-push',
      name: 'PUSH',
      exercises: [
        {
          exercise_id: 'ex-1',
          target_sets: 3,
          target_reps: 8,
          exercises: { id: 'ex-1', name: 'Bench', muscle_group: 'push', one_rm: 100 },
        },
      ],
    };
    global.fetch.mockResolvedValue(okResponse({ routine: routineDetail }));

    const result = await useMesocycleStore.getState().loadRoutineForTab('push');

    expect(result).toEqual(routineDetail);
    expect(useMesocycleStore.getState().activeRoutineDetail).toEqual(routineDetail);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/routines?id=routine-push'),
      expect.anything()
    );
  });

  it('returns null without a network call when no routine matches the tab yet', async () => {
    const result = await useMesocycleStore.getState().loadRoutineForTab('pull');

    expect(result).toBeNull();
    expect(useMesocycleStore.getState().activeRoutineDetail).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useMesocycleStore.createRoutineForTab', () => {
  it('creates a routine named UPPER(tab), appends it, and loads its (empty) detail', async () => {
    const newRoutine = { id: 'routine-pull', name: 'PULL', user_id: 'user-1' };
    global.fetch
      .mockResolvedValueOnce(okResponse({ routine: newRoutine })) // POST /routines
      .mockResolvedValueOnce(okResponse({ routine: { ...newRoutine, exercises: [] } })); // GET /routines?id=

    const result = await useMesocycleStore.getState().createRoutineForTab('pull');

    expect(result.success).toBe(true);
    expect(result.routine.name).toBe('PULL');
    expect(useMesocycleStore.getState().routines.map((r) => r.name)).toEqual(['PUSH', 'PULL']);
    expect(useMesocycleStore.getState().activeRoutineDetail).toEqual({
      ...newRoutine,
      exercises: [],
    });
  });

  it('surfaces the error and leaves routines untouched when creation fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));

    const result = await useMesocycleStore.getState().createRoutineForTab('pull');

    expect(result.success).toBe(false);
    expect(useMesocycleStore.getState().routines).toEqual([PUSH_ROUTINE]);
  });
});

describe('useMesocycleStore.addExerciseToRoutine', () => {
  it('upserts the membership and refreshes the cached routine detail', async () => {
    const refreshedDetail = {
      id: 'routine-push',
      name: 'PUSH',
      exercises: [
        {
          exercise_id: 'ex-1',
          target_sets: 4,
          target_reps: 6,
          exercises: { id: 'ex-1', name: 'Bench', muscle_group: 'push', one_rm: 100 },
        },
      ],
    };
    global.fetch
      .mockResolvedValueOnce(okResponse({ exercises: [{ exercise_id: 'ex-1' }] })) // POST membership
      .mockResolvedValueOnce(okResponse({ routine: refreshedDetail })); // GET routine detail

    const result = await useMesocycleStore
      .getState()
      .addExerciseToRoutine('routine-push', 'ex-1', 4, 6);

    expect(result.success).toBe(true);
    expect(useMesocycleStore.getState().activeRoutineDetail).toEqual(refreshedDetail);
  });

  it('does not refresh the routine detail when the upsert itself fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));

    const result = await useMesocycleStore
      .getState()
      .addExerciseToRoutine('routine-push', 'ex-1', 4, 6);

    expect(result.success).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(useMesocycleStore.getState().activeRoutineDetail).toBeNull();
  });
});

describe('useMesocycleStore.removeExerciseFromRoutine', () => {
  const detail = {
    id: 'routine-push',
    name: 'PUSH',
    exercises: [
      { exercise_id: 'ex-1', target_sets: 3, target_reps: 8, exercises: { id: 'ex-1', name: 'Bench' } },
      { exercise_id: 'ex-2', target_sets: 3, target_reps: 8, exercises: { id: 'ex-2', name: 'OHP' } },
    ],
  };

  beforeEach(() => {
    useMesocycleStore.setState({
      activeRoutineDetail: { ...detail, exercises: detail.exercises.map((ex) => ({ ...ex })) },
    });
  });

  it('removes the membership from the cached detail immediately (optimistic)', () => {
    global.fetch.mockReturnValue(new Promise(() => {}));

    useMesocycleStore.getState().removeExerciseFromRoutine('routine-push', 'ex-1');

    expect(
      useMesocycleStore.getState().activeRoutineDetail.exercises.map((ex) => ex.exercise_id)
    ).toEqual(['ex-2']);
  });

  it('keeps it removed when the request succeeds', async () => {
    global.fetch.mockResolvedValue(okResponse({}));

    await useMesocycleStore.getState().removeExerciseFromRoutine('routine-push', 'ex-1');

    expect(
      useMesocycleStore.getState().activeRoutineDetail.exercises.map((ex) => ex.exercise_id)
    ).toEqual(['ex-2']);
  });

  it('rolls back the cached detail when the request fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));

    const result = await useMesocycleStore
      .getState()
      .removeExerciseFromRoutine('routine-push', 'ex-1');

    expect(result.success).toBe(false);
    expect(
      useMesocycleStore.getState().activeRoutineDetail.exercises.map((ex) => ex.exercise_id)
    ).toEqual(['ex-1', 'ex-2']);
  });

  it('only touches the cached detail when it belongs to the routine being modified', () => {
    global.fetch.mockReturnValue(new Promise(() => {}));
    useMesocycleStore.setState({
      activeRoutineDetail: { id: 'routine-other', name: 'PULL', exercises: [{ exercise_id: 'ex-9' }] },
    });

    useMesocycleStore.getState().removeExerciseFromRoutine('routine-push', 'ex-1');

    expect(useMesocycleStore.getState().activeRoutineDetail.exercises).toEqual([
      { exercise_id: 'ex-9' },
    ]);
  });
});
