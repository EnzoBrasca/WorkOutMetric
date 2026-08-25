import { useAuthStore } from '../useAuthStore';

describe('setUsername', () => {
  beforeEach(() => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: 'user-1', username: 'old-name', preferences: { theme: 'dark' } },
      token: 'test-token',
      refreshToken: 'test-refresh',
    });
  });

  // The profile screen used to destructure `set` straight off the store to do
  // this. `set` is zustand's own parameter, never part of the state, so it came
  // back undefined and calling it threw "undefined is not a function". The bug
  // stayed invisible while /api/auth/update always answered 403, because the
  // screen threw on the response before ever reaching the update.
  it('is exposed as a callable action on the store', () => {
    expect(typeof useAuthStore.getState().setUsername).toBe('function');
  });

  it('does not expose zustand\'s set as state', () => {
    expect(useAuthStore.getState().set).toBeUndefined();
  });

  it('updates the username', () => {
    useAuthStore.getState().setUsername('new-name');

    expect(useAuthStore.getState().user.username).toBe('new-name');
  });

  it('leaves the rest of the user untouched', () => {
    useAuthStore.getState().setUsername('new-name');
    const { user } = useAuthStore.getState();

    expect(user.id).toBe('user-1');
    expect(user.preferences).toEqual({ theme: 'dark' });
  });

  it('does not resurrect a signed-out user', () => {
    useAuthStore.setState({ isAuthenticated: false, user: null });

    useAuthStore.getState().setUsername('new-name');

    expect(useAuthStore.getState().user).toBeNull();
  });
});
