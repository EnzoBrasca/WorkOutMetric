import { useMesocycleStore } from '../useMesocycleStore';
import { useAuthStore } from '../useAuthStore';

// Routines are user-created and arbitrarily named now: the Train tabs are one
// per routine and resolve by id, so nothing here may fall back to matching a
// routine by its name.

const PUSH_ROUTINE = {
  id: 'routine-push',
  name: 'PUSH',
  type: 'PUSH',
  user_id: 'user-1',
  exercise_count: 1,
};

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

describe('useMesocycleStore.loadRoutineDetail', () => {
  it('loads the membership of the routine with that id', async () => {
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

    const result = await useMesocycleStore.getState().loadRoutineDetail('routine-push');

    expect(result).toEqual(routineDetail);
    expect(useMesocycleStore.getState().activeRoutineDetail).toEqual(routineDetail);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/routines?id=routine-push'),
      expect.anything()
    );
  });

  it('clears the cached detail without a network call when the id is unknown', async () => {
    useMesocycleStore.setState({ activeRoutineDetail: { id: 'routine-push', exercises: [] } });

    const result = await useMesocycleStore.getState().loadRoutineDetail('routine-gone');

    expect(result).toBeNull();
    expect(useMesocycleStore.getState().activeRoutineDetail).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('clears the cached detail when no routine is selected at all', async () => {
    useMesocycleStore.setState({ activeRoutineDetail: { id: 'routine-push', exercises: [] } });

    const result = await useMesocycleStore.getState().loadRoutineDetail(null);

    expect(result).toBeNull();
    expect(useMesocycleStore.getState().activeRoutineDetail).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useMesocycleStore.createRoutine', () => {
  it('creates the routine with its name, type and description, then joins the chosen exercises', async () => {
    const created = { id: 'routine-legs', name: 'Pierna', type: 'LEGS', user_id: 'user-1' };
    global.fetch
      .mockResolvedValueOnce(okResponse({ routine: created })) // POST /routines
      .mockResolvedValueOnce(okResponse({ exercises: [] })); // POST membership

    const result = await useMesocycleStore.getState().createRoutine({
      name: 'Pierna',
      type: 'LEGS',
      description: 'Cuádriceps y femoral',
      exerciseIds: ['ex-1', 'ex-2'],
    });

    expect(result.success).toBe(true);
    expect(result.routine.id).toBe('routine-legs');

    const [, createOptions] = global.fetch.mock.calls[0];
    expect(JSON.parse(createOptions.body)).toEqual({
      name: 'Pierna',
      type: 'LEGS',
      description: 'Cuádriceps y femoral',
    });

    // Membership goes up as ONE batched request, not one per exercise.
    const [membershipUrl, membershipOptions] = global.fetch.mock.calls[1];
    expect(membershipUrl).toContain('/routines?resource=exercises&routine_id=routine-legs');
    expect(JSON.parse(membershipOptions.body).exercises.map((ex) => ex.exercise_id)).toEqual([
      'ex-1',
      'ex-2',
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('appends the routine with the exercise count the cards display', async () => {
    const created = { id: 'routine-legs', name: 'Pierna', type: 'LEGS' };
    global.fetch
      .mockResolvedValueOnce(okResponse({ routine: created }))
      .mockResolvedValueOnce(okResponse({ exercises: [] }));

    await useMesocycleStore
      .getState()
      .createRoutine({ name: 'Pierna', type: 'LEGS', exerciseIds: ['ex-1'] });

    const routines = useMesocycleStore.getState().routines;
    expect(routines.map((r) => r.id)).toEqual(['routine-push', 'routine-legs']);
    expect(routines[1].exercise_count).toBe(1);
  });

  it('skips the membership request entirely when no exercise was picked', async () => {
    global.fetch.mockResolvedValueOnce(okResponse({ routine: { id: 'routine-abs', name: 'Abs' } }));

    const result = await useMesocycleStore.getState().createRoutine({ name: 'Abs' });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(useMesocycleStore.getState().routines[1].exercise_count).toBe(0);
  });

  it('surfaces the error and leaves routines untouched when creation fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));

    const result = await useMesocycleStore.getState().createRoutine({ name: 'Pierna' });

    expect(result.success).toBe(false);
    expect(useMesocycleStore.getState().routines).toEqual([PUSH_ROUTINE]);
    expect(useMesocycleStore.getState().error).toBe('Network request failed');
  });

  it('keeps the created routine when only the membership request fails', async () => {
    const created = { id: 'routine-legs', name: 'Pierna' };
    global.fetch
      .mockResolvedValueOnce(okResponse({ routine: created }))
      .mockRejectedValueOnce(new Error('Network request failed'));

    const result = await useMesocycleStore
      .getState()
      .createRoutine({ name: 'Pierna', exerciseIds: ['ex-1'] });

    // The routine exists server-side, so hiding it would strand it.
    expect(result.success).toBe(false);
    expect(useMesocycleStore.getState().routines.map((r) => r.id)).toContain('routine-legs');
    expect(useMesocycleStore.getState().routines[1].exercise_count).toBe(0);
  });
});

describe('useMesocycleStore.updateRoutine', () => {
  it('patches only the fields it was given and mirrors them locally', async () => {
    global.fetch.mockResolvedValue(
      okResponse({ routine: { ...PUSH_ROUTINE, name: 'Empuje A' } })
    );

    const result = await useMesocycleStore
      .getState()
      .updateRoutine('routine-push', { name: 'Empuje A' });

    expect(result.success).toBe(true);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/routines?id=routine-push');
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body)).toEqual({ name: 'Empuje A' });
    expect(useMesocycleStore.getState().routines[0].name).toBe('Empuje A');
    // The count is local bookkeeping the PATCH response knows nothing about.
    expect(useMesocycleStore.getState().routines[0].exercise_count).toBe(1);
  });

  it('rolls the rename back when the request fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));

    const result = await useMesocycleStore
      .getState()
      .updateRoutine('routine-push', { name: 'Empuje A' });

    expect(result.success).toBe(false);
    expect(useMesocycleStore.getState().routines).toEqual([PUSH_ROUTINE]);
  });
});

describe('useMesocycleStore.deleteRoutine', () => {
  it('removes it optimistically and keeps it removed on success', async () => {
    global.fetch.mockResolvedValue(okResponse({}));

    const result = await useMesocycleStore.getState().deleteRoutine('routine-push');

    expect(result.success).toBe(true);
    expect(useMesocycleStore.getState().routines).toEqual([]);
  });

  it('restores it and surfaces the 409 when a training block still uses it', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Routine is used by a training block (Block A).' }),
    });

    const result = await useMesocycleStore.getState().deleteRoutine('routine-push');

    expect(result.success).toBe(false);
    expect(useMesocycleStore.getState().routines).toEqual([PUSH_ROUTINE]);
    expect(useMesocycleStore.getState().error).toContain('training block');
  });

  it('drops the cached detail when the deleted routine was the one on screen', async () => {
    useMesocycleStore.setState({
      activeRoutineDetail: { id: 'routine-push', name: 'PUSH', exercises: [] },
    });
    global.fetch.mockResolvedValue(okResponse({}));

    await useMesocycleStore.getState().deleteRoutine('routine-push');

    expect(useMesocycleStore.getState().activeRoutineDetail).toBeNull();
  });
});

describe('useMesocycleStore.syncRoutineExercises', () => {
  it('adds only the newly selected exercises and removes only the deselected ones', async () => {
    global.fetch
      .mockResolvedValueOnce(okResponse({ exercises: [] })) // POST batch add
      .mockResolvedValueOnce(okResponse({})) // DELETE ex-2
      .mockResolvedValueOnce(okResponse({ routine: { id: 'routine-push', exercises: [] } })); // GET detail

    const result = await useMesocycleStore
      .getState()
      .syncRoutineExercises('routine-push', ['ex-1', 'ex-3'], ['ex-1', 'ex-2']);

    expect(result.success).toBe(true);

    const [addUrl, addOptions] = global.fetch.mock.calls[0];
    expect(addUrl).toContain('routine_id=routine-push');
    expect(JSON.parse(addOptions.body).exercises.map((ex) => ex.exercise_id)).toEqual(['ex-3']);

    const [removeUrl, removeOptions] = global.fetch.mock.calls[1];
    expect(removeUrl).toContain('exercise_id=ex-2');
    expect(removeOptions.method).toBe('DELETE');
  });

  it('does nothing but re-read when the selection is unchanged', async () => {
    global.fetch.mockResolvedValue(
      okResponse({ routine: { id: 'routine-push', exercises: [] } })
    );

    await useMesocycleStore.getState().syncRoutineExercises('routine-push', ['ex-1'], ['ex-1']);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][1].method).toBe('GET');
  });

  it('updates the exercise count on the routine card', async () => {
    global.fetch
      .mockResolvedValueOnce(okResponse({ exercises: [] }))
      .mockResolvedValueOnce(
        okResponse({
          routine: {
            id: 'routine-push',
            exercises: [{ exercise_id: 'ex-1' }, { exercise_id: 'ex-3' }],
          },
        })
      );

    await useMesocycleStore
      .getState()
      .syncRoutineExercises('routine-push', ['ex-1', 'ex-3'], ['ex-1']);

    expect(useMesocycleStore.getState().routines[0].exercise_count).toBe(2);
  });

  it('reports failure instead of pretending the list was saved', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));

    const result = await useMesocycleStore
      .getState()
      .syncRoutineExercises('routine-push', ['ex-3'], []);

    expect(result.success).toBe(false);
    expect(useMesocycleStore.getState().error).toBe('Network request failed');
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
  beforeEach(() => {
    useMesocycleStore.setState({
      activeRoutineDetail: {
        id: 'routine-push',
        name: 'PUSH',
        exercises: [{ exercise_id: 'ex-1' }, { exercise_id: 'ex-2' }],
      },
    });
  });

  it('drops it from the cached detail straight away (optimistic)', () => {
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
