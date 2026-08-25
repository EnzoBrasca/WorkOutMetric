import { formatElapsed } from '../WorkoutSessionView';

// The elapsed clock is the one number on screen the whole workout. It reads
// from the session's `started_at` timestamp, so it has to survive a missing or
// malformed one rather than rendering NaN over the session view.
describe('formatElapsed', () => {
  const startedAt = '2026-08-25T10:00:00.000Z';
  const at = (seconds) => Date.parse(startedAt) + seconds * 1000;

  it('shows mm:ss for a workout under an hour', () => {
    expect(formatElapsed(startedAt, at(5 * 60 + 7))).toBe('05:07');
  });

  it('pads both halves', () => {
    expect(formatElapsed(startedAt, at(63))).toBe('01:03');
  });

  it('adds the hours field only once the workout passes one', () => {
    expect(formatElapsed(startedAt, at(59 * 60 + 59))).toBe('59:59');
    expect(formatElapsed(startedAt, at(3600))).toBe('1:00:00');
    expect(formatElapsed(startedAt, at(2 * 3600 + 4 * 60 + 9))).toBe('2:04:09');
  });

  it('starts at zero', () => {
    expect(formatElapsed(startedAt, at(0))).toBe('00:00');
  });

  // Clock skew between phone and server can put `started_at` slightly ahead of
  // now. A negative elapsed time must read as zero, never as "-1:-3".
  it('clamps a start time in the future to zero', () => {
    expect(formatElapsed(startedAt, at(-120))).toBe('00:00');
  });

  it('falls back to zero when there is no start time', () => {
    expect(formatElapsed(null, Date.now())).toBe('00:00');
    expect(formatElapsed(undefined, Date.now())).toBe('00:00');
  });

  it('falls back to zero when the start time is not a date', () => {
    expect(formatElapsed('not a timestamp', Date.now())).toBe('00:00');
  });
});
