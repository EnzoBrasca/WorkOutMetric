import { useCallback, useEffect, useRef, useState } from 'react';

// Manual start/stop rest-period countdown (FRONTEND_TODO 2.7). Owns its own
// interval and always clears it — on stop, on natural completion, and on
// unmount of whatever component instantiates the hook — so it can never leak
// a timer.
export function useRestTimer(defaultDurationSec) {
  const [remainingSec, setRemainingSec] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setRemainingSec(0);
  }, [clearTimer]);

  const start = useCallback(
    (durationSec) => {
      clearTimer();
      const duration = Math.max(1, Math.round(durationSec ?? defaultDurationSec));
      setRemainingSec(duration);
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setRemainingSec((prev) => {
          if (prev <= 1) {
            clearTimer();
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearTimer, defaultDurationSec]
  );

  // Belt and braces: clears any running interval if the owning component
  // unmounts mid-countdown, instead of relying on stop() having been called.
  useEffect(() => clearTimer, [clearTimer]);

  return { remainingSec, isRunning, start, stop };
}
