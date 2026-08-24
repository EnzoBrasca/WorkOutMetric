import { apiRequest } from '../client';
import { useAuthStore } from '../../store/useAuthStore';

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function signedIn() {
  useAuthStore.setState({
    isAuthenticated: true,
    user: { id: 'user-1' },
    token: 'expired-access-token',
    refreshToken: 'good-refresh-token',
  });
}

beforeEach(() => {
  useAuthStore.setState({
    isAuthenticated: false,
    user: null,
    token: null,
    refreshToken: null,
  });
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// The bug this covers: Supabase access tokens live one hour, so a persisted
// session came back from storage looking valid, 401'd on every request, and the
// stores turned that into an empty screen instead of a renewed session.
describe('apiRequest session renewal', () => {
  it('renews the session and retries once when the access token has expired', async () => {
    signedIn();

    global.fetch
      .mockResolvedValueOnce(response(401, { error: 'Invalid token' }))
      .mockResolvedValueOnce(
        response(200, {
          user: { id: 'user-1' },
          session: { access_token: 'fresh-access-token', refresh_token: 'next-refresh-token' },
        })
      )
      .mockResolvedValueOnce(response(200, { routines: [{ id: 'r-1' }] }));

    const data = await apiRequest('/routines');

    expect(data).toEqual({ routines: [{ id: 'r-1' }] });
    expect(global.fetch).toHaveBeenCalledTimes(3);

    // The renewal goes through the consolidated login handler.
    const [refreshUrl, refreshInit] = global.fetch.mock.calls[1];
    expect(refreshUrl).toContain('/auth/login?grant_type=refresh_token');
    expect(JSON.parse(refreshInit.body)).toEqual({ refresh_token: 'good-refresh-token' });

    // The retry must carry the NEW token, not the dead one.
    const [, retryInit] = global.fetch.mock.calls[2];
    expect(retryInit.headers.Authorization).toBe('Bearer fresh-access-token');

    // Both halves of the new session are adopted, so the next expiry can renew too.
    expect(useAuthStore.getState().token).toBe('fresh-access-token');
    expect(useAuthStore.getState().refreshToken).toBe('next-refresh-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('clears the session and surfaces the error when the refresh token is dead too', async () => {
    signedIn();

    global.fetch
      .mockResolvedValueOnce(response(401, { error: 'Invalid token' }))
      .mockResolvedValueOnce(response(401, { error: 'Invalid Refresh Token' }));

    await expect(apiRequest('/routines')).rejects.toThrow('Invalid token');

    // Signed out rather than left sitting in an app that silently shows nothing.
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();

    // No retry once the refresh is refused.
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('does not attempt a renewal when no one is signed in', async () => {
    global.fetch.mockResolvedValueOnce(response(401, { error: 'Invalid token' }));

    await expect(apiRequest('/routines')).rejects.toThrow('Invalid token');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('leaves a successful request alone', async () => {
    signedIn();
    global.fetch.mockResolvedValueOnce(response(200, { routines: [] }));

    await expect(apiRequest('/routines')).resolves.toEqual({ routines: [] });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().token).toBe('expired-access-token');
  });

  it('does not renew on a non-401 failure', async () => {
    signedIn();
    global.fetch.mockResolvedValueOnce(response(500, { error: 'Boom' }));

    await expect(apiRequest('/routines')).rejects.toThrow('Boom');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
