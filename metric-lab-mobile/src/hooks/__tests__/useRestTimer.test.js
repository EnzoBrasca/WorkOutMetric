import { renderHook, act } from '@testing-library/react-native';
import { useRestTimer } from '../useRestTimer';

// This version of @testing-library/react-native makes renderHook(), act()
// and unmount() all async (they wrap React's act() internally), so every one
// of them has to be awaited or state updates race the assertions below.

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('useRestTimer', () => {
  it('counts down from the given duration, one second at a time', async () => {
    const { result } = await renderHook(() => useRestTimer(90));

    await act(() => {
      result.current.start(5);
    });
    expect(result.current.remainingSec).toBe(5);
    expect(result.current.isRunning).toBe(true);

    await act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.remainingSec).toBe(4);

    await act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.remainingSec).toBe(1);
  });

  it('falls back to the default duration when start() is called with no argument', async () => {
    const { result } = await renderHook(() => useRestTimer(45));

    await act(() => {
      result.current.start();
    });

    expect(result.current.remainingSec).toBe(45);
  });

  it('stops running and settles at zero when the countdown reaches the end', async () => {
    const { result } = await renderHook(() => useRestTimer(2));

    await act(() => {
      result.current.start();
    });
    await act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.remainingSec).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('can be cancelled manually before it finishes', async () => {
    const { result } = await renderHook(() => useRestTimer(90));

    await act(() => {
      result.current.start(30);
    });
    await act(() => {
      result.current.stop();
    });

    expect(result.current.remainingSec).toBe(0);
    expect(result.current.isRunning).toBe(false);

    // Advancing time after stop() must not resurrect the countdown — proves
    // the interval was actually cleared, not just visually reset.
    await act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.remainingSec).toBe(0);
  });

  it('clears the interval on unmount instead of leaking it', async () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const { result, unmount } = await renderHook(() => useRestTimer(90));

    await act(() => {
      result.current.start(10);
    });
    await unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();

    // No further clearInterval calls should happen after unmount — proves
    // there's nothing left running to clean up.
    const callsBeforeAdvance = clearIntervalSpy.mock.calls.length;
    await act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(clearIntervalSpy.mock.calls.length).toBe(callsBeforeAdvance);
  });

  it('restarting cancels the previous interval instead of running two at once', async () => {
    const { result } = await renderHook(() => useRestTimer(90));

    await act(() => {
      result.current.start(10);
    });
    await act(() => {
      result.current.start(3);
    });

    expect(result.current.remainingSec).toBe(3);

    await act(() => {
      jest.advanceTimersByTime(1000);
    });
    // If the first interval had leaked, remainingSec would have been
    // decremented twice per tick instead of once.
    expect(result.current.remainingSec).toBe(2);
  });
});
