import { useSessionStore } from '../useSessionStore';
import { useAuthStore } from '../useAuthStore';

function resetStore() {
  useSessionStore.setState({
    activeSession: null,
    activeSummary: null,
    isLoadingActive: false,
    isStartingSession: false,
    isFinishingSession: false,
    history: [],
    historyOffset: 0,
    hasMoreHistory: true,
    isLoadingHistory: false,
    isLoadingMoreHistory: false,
    historyError: null,
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

describe('useSessionStore.startSession', () => {
  it('returns the session already held in state without a network call', async () => {
    const existing = { id: 'sess-1' };
    useSessionStore.setState({ activeSession: existing });

    const result = await useSessionStore.getState().startSession({});

    expect(result).toEqual(existing);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('starts a new session, tagging it with the given mesocycle context', async () => {
    const session = { id: 'sess-2', mesocycle_id: 'meso-1', mesocycle_week: 2 };
    global.fetch.mockResolvedValue(okResponse({ session, resumed: false }));

    const result = await useSessionStore
      .getState()
      .startSession({ mesocycleId: 'meso-1', mesocycleWeek: 2 });

    expect(result).toEqual(session);
    expect(useSessionStore.getState().activeSession).toEqual(session);

    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      mesocycle_id: 'meso-1',
      mesocycle_week: 2,
    });
  });

  it('records the error and returns null when the request fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));

    const result = await useSessionStore.getState().startSession({});

    expect(result).toBeNull();
    expect(useSessionStore.getState().activeSession).toBeNull();
    expect(useSessionStore.getState().error).toBe('Network request failed');
  });
});

describe('useSessionStore.ensureActiveSessionId', () => {
  it('returns the id of an already-open session without starting a new one', async () => {
    useSessionStore.setState({ activeSession: { id: 'sess-1' } });

    const id = await useSessionStore.getState().ensureActiveSessionId({});

    expect(id).toBe('sess-1');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('auto-starts a session and returns its id when none is open', async () => {
    const session = { id: 'sess-3' };
    global.fetch.mockResolvedValue(okResponse({ session, resumed: false }));

    const id = await useSessionStore.getState().ensureActiveSessionId({});

    expect(id).toBe('sess-3');
  });

  it('returns null (never throws) when starting a session fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));

    const id = await useSessionStore.getState().ensureActiveSessionId({});

    expect(id).toBeNull();
  });
});

describe('useSessionStore.logSet', () => {
  it('does not call the network and returns null when there is no session id', async () => {
    const result = await useSessionStore.getState().logSet(null, { exercise_id: 'ex-1' });

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('posts the log and refreshes the active session summary on success', async () => {
    const log = { id: 'log-1', exerciseId: 'ex-1' };
    const summary = { id: 'sess-1', totalSets: 3 };
    global.fetch
      .mockResolvedValueOnce(okResponse({ log }))
      .mockResolvedValueOnce(okResponse({ session: { id: 'sess-1' }, summary }));

    const result = await useSessionStore.getState().logSet('sess-1', { exercise_id: 'ex-1' });

    expect(result).toEqual(log);
    expect(useSessionStore.getState().activeSummary).toEqual(summary);
  });

  it('returns null and does not throw when the request fails', async () => {
    global.fetch.mockRejectedValue(new Error('Network request failed'));

    const result = await useSessionStore.getState().logSet('sess-1', { exercise_id: 'ex-1' });

    expect(result).toBeNull();
  });
});

describe('useSessionStore.finishSession', () => {
  it('does nothing when there is no active session', async () => {
    const result = await useSessionStore.getState().finishSession();

    expect(result).toEqual({ success: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('clears the active session and summary on success', async () => {
    useSessionStore.setState({ activeSession: { id: 'sess-1' }, activeSummary: { id: 'sess-1' } });
    global.fetch.mockResolvedValue(okResponse({ session: { id: 'sess-1', ended_at: '2026-01-01T00:00:00Z' } }));

    const result = await useSessionStore.getState().finishSession();

    expect(result).toEqual({ success: true });
    expect(useSessionStore.getState().activeSession).toBeNull();
    expect(useSessionStore.getState().activeSummary).toBeNull();
  });

  it('keeps the active session and reports the error when the request fails', async () => {
    useSessionStore.setState({ activeSession: { id: 'sess-1' }, activeSummary: { id: 'sess-1' } });
    global.fetch.mockRejectedValue(new Error('Network request failed'));

    const result = await useSessionStore.getState().finishSession();

    expect(result.success).toBe(false);
    expect(useSessionStore.getState().activeSession).toEqual({ id: 'sess-1' });
  });
});

describe('useSessionStore history pagination', () => {
  it('marks hasMoreHistory false when fewer sessions than the page limit come back', async () => {
    const sessions = [{ id: 's-1' }, { id: 's-2' }];
    global.fetch.mockResolvedValue(okResponse({ sessions, limit: 20, offset: 0 }));

    await useSessionStore.getState().loadHistory();

    expect(useSessionStore.getState().history).toEqual(sessions);
    expect(useSessionStore.getState().hasMoreHistory).toBe(false);
    expect(useSessionStore.getState().historyOffset).toBe(2);
  });

  it('appends the next page and advances the offset', async () => {
    useSessionStore.setState({ history: [{ id: 's-1' }], historyOffset: 1, hasMoreHistory: true });
    const nextPage = [{ id: 's-2' }];
    global.fetch.mockResolvedValue(okResponse({ sessions: nextPage, limit: 20, offset: 1 }));

    await useSessionStore.getState().loadMoreHistory();

    expect(useSessionStore.getState().history).toEqual([{ id: 's-1' }, { id: 's-2' }]);
    expect(useSessionStore.getState().historyOffset).toBe(2);
  });

  it('does not call the network when there is no more history to load', async () => {
    useSessionStore.setState({ hasMoreHistory: false });

    await useSessionStore.getState().loadMoreHistory();

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
