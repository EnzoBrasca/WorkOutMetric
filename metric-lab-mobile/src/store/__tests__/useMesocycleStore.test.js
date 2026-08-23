import { useMesocycleStore } from '../useMesocycleStore';
import { useAuthStore } from '../useAuthStore';

const INITIAL_MESOCYCLES = [
  { id: 'meso-1', name: 'Block A', current_week: 1 },
  { id: 'meso-2', name: 'Block B', current_week: 3 },
];
const INITIAL_PLAN = { week: 1, targets: [{ exerciseId: 'ex-1', targetWeight: 80 }] };

function resetStore() {
  useMesocycleStore.setState({
    mesocycles: INITIAL_MESOCYCLES.map((m) => ({ ...m })),
    activeMesocycleId: 'meso-1',
    routines: [],
    plan: { ...INITIAL_PLAN },
    isLoading: false,
    isPlanLoading: false,
    isSettingOneRm: false,
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

describe('useMesocycleStore.setCurrentWeek', () => {
  it('does nothing when there is no active mesocycle', async () => {
    useMesocycleStore.setState({ activeMesocycleId: null });

    await useMesocycleStore.getState().setCurrentWeek(2);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(useMesocycleStore.getState().mesocycles).toEqual(INITIAL_MESOCYCLES);
  });

  it('bumps current_week optimistically before the request resolves', () => {
    // Never resolves during this assertion — we only care about the
    // synchronous optimistic update, before the round trip settles.
    global.fetch.mockReturnValue(new Promise(() => {}));

    useMesocycleStore.getState().setCurrentWeek(2);

    const active = useMesocycleStore
      .getState()
      .mesocycles.find((m) => m.id === 'meso-1');
    expect(active.current_week).toBe(2);
    // The stale plan is kept on screen during the round trip rather than blanked.
    expect(useMesocycleStore.getState().plan).toEqual(INITIAL_PLAN);
  });

  it('adopts the server response and refreshes the plan on success', async () => {
    const updatedMesocycle = { id: 'meso-1', name: 'Block A', current_week: 2 };
    const newPlan = { week: 2, targets: [{ exerciseId: 'ex-1', targetWeight: 84 }] };

    global.fetch
      .mockResolvedValueOnce(okResponse({ mesocycle: updatedMesocycle }))
      .mockResolvedValueOnce(okResponse({ plan: newPlan }));

    await useMesocycleStore.getState().setCurrentWeek(2);

    const state = useMesocycleStore.getState();
    expect(state.mesocycles.find((m) => m.id === 'meso-1')).toEqual(updatedMesocycle);
    expect(state.plan).toEqual(newPlan);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('rolls back mesocycles and plan when the server rejects the week change', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));

    await useMesocycleStore.getState().setCurrentWeek(2);

    const state = useMesocycleStore.getState();
    expect(state.mesocycles).toEqual(INITIAL_MESOCYCLES);
    expect(state.plan).toEqual(INITIAL_PLAN);
  });

  it('rolls back mesocycles and plan when the server responds with a non-ok status', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'week out of range' }),
    });

    await useMesocycleStore.getState().setCurrentWeek(2);

    const state = useMesocycleStore.getState();
    expect(state.mesocycles).toEqual(INITIAL_MESOCYCLES);
    expect(state.plan).toEqual(INITIAL_PLAN);
    // Only the failed PATCH call — refreshPlan must not run after a rejection.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('leaves the other mesocycle untouched by a failed update to the active one', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));

    await useMesocycleStore.getState().setCurrentWeek(2);

    const other = useMesocycleStore.getState().mesocycles.find((m) => m.id === 'meso-2');
    expect(other).toEqual({ id: 'meso-2', name: 'Block B', current_week: 3 });
  });
});
