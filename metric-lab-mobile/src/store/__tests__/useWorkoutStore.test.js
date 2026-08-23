import { useWorkoutStore } from '../useWorkoutStore';
import { useAuthStore } from '../useAuthStore';

const EXERCISES = [
  { id: 'ex-1', name: 'Bench Press', type: 'push', weight: '80kg' },
  { id: 'ex-2', name: 'Squat', type: 'pull', weight: '' },
];

function resetStores() {
  useWorkoutStore.setState({
    exercises: EXERCISES.map((ex) => ({ ...ex })),
    sessionLogs: [],
    isLoading: false,
    activeTab: 'push',
  });
  useAuthStore.setState({
    isAuthenticated: true,
    user: { id: 'user-1' },
    token: 'test-token',
  });
}

beforeEach(() => {
  resetStores();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useWorkoutStore.removeExercise', () => {
  it('removes the exercise locally right away (optimistic update)', () => {
    // Never resolves during this assertion — we only care about the
    // synchronous part of the call, before the network round trip settles.
    global.fetch.mockReturnValue(new Promise(() => {}));

    useWorkoutStore.getState().removeExercise('ex-1');

    expect(useWorkoutStore.getState().exercises.map((ex) => ex.id)).toEqual(['ex-2']);
  });

  it('keeps the exercise removed when the DELETE request succeeds', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    await useWorkoutStore.getState().removeExercise('ex-1');

    expect(useWorkoutStore.getState().exercises.map((ex) => ex.id)).toEqual(['ex-2']);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/data/sync?id=ex-1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('treats a 404 as already-deleted and does not roll back', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });

    await useWorkoutStore.getState().removeExercise('ex-1');

    expect(useWorkoutStore.getState().exercises.map((ex) => ex.id)).toEqual(['ex-2']);
  });

  it('rolls back the local removal when the DELETE request fails (non-ok, non-404 status)', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    await useWorkoutStore.getState().removeExercise('ex-1');

    // The exercise must be back, in its original spot, with its original data.
    expect(useWorkoutStore.getState().exercises).toEqual(EXERCISES);
  });

  it('rolls back the local removal when the DELETE request throws (network failure)', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));

    await useWorkoutStore.getState().removeExercise('ex-1');

    expect(useWorkoutStore.getState().exercises).toEqual(EXERCISES);
  });

  it('does not attempt a network call, and does not roll back, when there is no auth token', async () => {
    useAuthStore.setState({ token: null });

    await useWorkoutStore.getState().removeExercise('ex-1');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(useWorkoutStore.getState().exercises.map((ex) => ex.id)).toEqual(['ex-2']);
  });
});

describe('useWorkoutStore.logSession', () => {
  beforeEach(() => {
    // logSession's own sync call is fire-and-forget from the test's point of
    // view; keep it resolving so no unhandled rejections leak between tests.
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  });

  it('uses the explicit targetWeight when one is provided, ignoring the free-text weight field', async () => {
    await useWorkoutStore.getState().logSession('ex-1', 3, 10, 92.5);

    const [log] = useWorkoutStore.getState().sessionLogs;
    expect(log.weight).toBe(92.5);
  });

  it('falls back to the exercise free-text weight when targetWeight is null (no 1RM on record)', async () => {
    await useWorkoutStore.getState().logSession('ex-1', 3, 10, null);

    const [log] = useWorkoutStore.getState().sessionLogs;
    expect(log.weight).toBe('80kg');
  });

  it('falls back to the exercise free-text weight when targetWeight is undefined (argument omitted)', async () => {
    await useWorkoutStore.getState().logSession('ex-1', 3, 10);

    const [log] = useWorkoutStore.getState().sessionLogs;
    expect(log.weight).toBe('80kg');
  });

  it('falls back to 0 when targetWeight is null and the exercise has no free-text weight either', async () => {
    await useWorkoutStore.getState().logSession('ex-2', 3, 10, null);

    const [log] = useWorkoutStore.getState().sessionLogs;
    expect(log.weight).toBe(0);
  });

  it('keeps an explicit targetWeight of 0, instead of falling back (?? semantics, not ||)', async () => {
    // If the precedence check were ever weakened from `??` to `||`, this is
    // the case that would silently break: 0 is a valid, deliberate target
    // weight and must NOT be treated the same as "no target provided".
    await useWorkoutStore.getState().logSession('ex-1', 3, 10, 0);

    const [log] = useWorkoutStore.getState().sessionLogs;
    expect(log.weight).toBe(0);
  });

  it('appends the new log without discarding previous session logs', async () => {
    await useWorkoutStore.getState().logSession('ex-1', 3, 10, 100);
    await useWorkoutStore.getState().logSession('ex-2', 4, 8, 50);

    const logs = useWorkoutStore.getState().sessionLogs;
    expect(logs).toHaveLength(2);
    expect(logs.map((l) => l.weight)).toEqual([100, 50]);
  });
});
