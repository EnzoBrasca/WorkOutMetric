import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  artDateOf,
  artMidnightUtc,
  artMondayOf,
  currentWeekFor,
  mondayOf,
  mondaysBetween,
} from './weekAnchor';

// Every case pins an exact UTC instant and asserts what Argentina was living
// in at that instant. ART is UTC-3 all year (no DST), so 00:00 ART is 03:00 UTC.

const anchor = (overrides: Partial<Parameters<typeof currentWeekFor>[0]> = {}) => ({
  week_anchor_week: 1,
  week_anchor_monday: '2026-08-24',
  total_weeks: 4,
  ...overrides,
});

describe('artDateOf', () => {
  test('reports the Argentine calendar date, not the UTC one', () => {
    // 02:30 UTC on Monday is 23:30 the previous SUNDAY in Buenos Aires.
    assert.equal(artDateOf(new Date('2026-08-24T02:30:00Z')), '2026-08-23');
    // 03:00 UTC is exactly 00:00 ART, so the Argentine date has just rolled.
    assert.equal(artDateOf(new Date('2026-08-24T03:00:00Z')), '2026-08-24');
  });

  test('does not shift by an hour in the southern summer', () => {
    // Argentina abolished DST in 2009. An implementation that assumed a summer
    // offset of -2 would put this instant on 2026-01-05 instead.
    assert.equal(artDateOf(new Date('2026-01-05T02:30:00Z')), '2026-01-04');
    assert.equal(artDateOf(new Date('2026-07-06T02:30:00Z')), '2026-07-05');
  });
});

describe('artMidnightUtc', () => {
  test('returns the real UTC instant that is 00:00 in Buenos Aires', () => {
    // ART midnight on Aug 1st is 03:00 UTC the same day (ART is UTC-3).
    assert.equal(artMidnightUtc('2026-08-01').toISOString(), '2026-08-01T03:00:00.000Z');
  });

  test('is stable across the southern summer (no DST)', () => {
    assert.equal(artMidnightUtc('2026-01-01').toISOString(), '2026-01-01T03:00:00.000Z');
  });

  test('crosses a year boundary correctly', () => {
    assert.equal(artMidnightUtc('2027-01-01').toISOString(), '2027-01-01T03:00:00.000Z');
  });
});

describe('mondayOf', () => {
  test('maps every day of a week back to that week\'s Monday', () => {
    assert.equal(mondayOf('2026-08-24'), '2026-08-24'); // Monday itself
    assert.equal(mondayOf('2026-08-25'), '2026-08-24'); // Tuesday
    assert.equal(mondayOf('2026-08-30'), '2026-08-24'); // Sunday closes the week
    assert.equal(mondayOf('2026-08-31'), '2026-08-31'); // next Monday
  });

  test('crosses month and year boundaries', () => {
    assert.equal(mondayOf('2026-09-02'), '2026-08-31');
    assert.equal(mondayOf('2026-01-01'), '2025-12-29');
  });
});

describe('artMondayOf', () => {
  test('rolls over exactly at Monday 00:00 ART, not at 00:00 UTC', () => {
    // One second before the boundary the user is still in the previous week.
    assert.equal(artMondayOf(new Date('2026-08-24T02:59:59Z')), '2026-08-17');
    // Dead on the boundary, the new week has started.
    assert.equal(artMondayOf(new Date('2026-08-24T03:00:00Z')), '2026-08-24');
  });

  test('a UTC-date implementation would already have advanced at 00:00 UTC', () => {
    // 00:00 UTC Monday is 21:00 Sunday in Buenos Aires: still last week.
    assert.equal(artMondayOf(new Date('2026-08-24T00:00:00Z')), '2026-08-17');
  });

  test('is stable across the southern summer', () => {
    assert.equal(artMondayOf(new Date('2026-01-05T02:30:00Z')), '2025-12-29');
    assert.equal(artMondayOf(new Date('2026-07-06T02:30:00Z')), '2026-06-29');
  });
});

describe('mondaysBetween', () => {
  test('counts whole calendar weeks', () => {
    assert.equal(mondaysBetween('2026-08-24', '2026-08-24'), 0);
    assert.equal(mondaysBetween('2026-08-24', '2026-08-31'), 1);
    assert.equal(mondaysBetween('2026-08-24', '2026-09-21'), 4);
  });

  test('goes negative when the target is behind the anchor', () => {
    assert.equal(mondaysBetween('2026-08-24', '2026-08-10'), -2);
  });

  test('snaps a non-Monday anchor to its own Monday instead of drifting', () => {
    // Defensive: hand-edited or legacy data may hold a mid-week date.
    assert.equal(mondaysBetween('2026-08-26', '2026-08-31'), 1);
  });
});

describe('currentWeekFor', () => {
  test('holds the anchor week for the whole calendar week it was set in', () => {
    const m = anchor();
    assert.equal(currentWeekFor(m, new Date('2026-08-24T03:00:00Z')), 1);
    assert.equal(currentWeekFor(m, new Date('2026-08-27T15:00:00Z')), 1);
    // Sunday 23:59:59 ART — still week 1.
    assert.equal(currentWeekFor(m, new Date('2026-08-31T02:59:59Z')), 1);
  });

  test('advances the instant Monday 00:00 ART arrives', () => {
    assert.equal(
      currentWeekFor(anchor(), new Date('2026-08-31T03:00:00Z')),
      2
    );
  });

  test('resumes from a manually set week rather than from week 1', () => {
    // The user onboarded a block they had already been running: week 3 as of
    // the week of the 24th. The next Monday is week 4, not week 2.
    const m = anchor({ week_anchor_week: 3 });
    assert.equal(currentWeekFor(m, new Date('2026-08-24T12:00:00Z')), 3);
    assert.equal(currentWeekFor(m, new Date('2026-08-31T03:00:00Z')), 4);
  });

  test('clamps to total_weeks instead of overflowing past the end of the block', () => {
    const m = anchor({ total_weeks: 4 });
    // Ten weeks later the raw sum would be 11.
    assert.equal(currentWeekFor(m, new Date('2026-11-02T12:00:00Z')), 4);
  });

  test('clamps to 1 for an anchor that sits in the future', () => {
    const m = anchor({ week_anchor_week: 1, week_anchor_monday: '2026-09-21' });
    assert.equal(currentWeekFor(m, new Date('2026-08-24T12:00:00Z')), 1);
  });

  test('a future anchor with a high week still cannot go below 1', () => {
    const m = anchor({ week_anchor_week: 2, week_anchor_monday: '2026-09-21' });
    assert.equal(currentWeekFor(m, new Date('2026-08-24T12:00:00Z')), 1);
  });

  test('an anchor set in the past catches the block up on read', () => {
    // Anchor: week 1 during the week of 2026-08-03. Three Mondays have passed.
    const m = anchor({ week_anchor_week: 1, week_anchor_monday: '2026-08-03' });
    assert.equal(currentWeekFor(m, new Date('2026-08-24T12:00:00Z')), 4);
  });

  test('accepts a Date for week_anchor_monday as well as an ISO string', () => {
    const m = anchor({ week_anchor_monday: new Date('2026-08-24T00:00:00Z') as any });
    assert.equal(currentWeekFor(m, new Date('2026-08-31T03:00:00Z')), 2);
  });

  test('a one-week block never leaves week 1', () => {
    const m = anchor({ total_weeks: 1 });
    assert.equal(currentWeekFor(m, new Date('2027-08-24T12:00:00Z')), 1);
  });
});

describe('the deload rule is unaffected by deriving the week', () => {
  test('currentWeekFor only produces a week number, never a percentage', () => {
    // percentForWeek (mesocycleCalculator) is what decides that a deload week
    // does not consume a ramp step. Deriving the week must not sneak a second
    // opinion in: it returns an integer in [1, total_weeks] and nothing else.
    const m = anchor({ total_weeks: 6, week_anchor_week: 2 });
    for (let i = 0; i < 10; i++) {
      const now = new Date(Date.UTC(2026, 7, 24 + i * 7, 12));
      const week = currentWeekFor(m, now);
      assert.ok(Number.isInteger(week));
      assert.ok(week >= 1 && week <= 6);
    }
  });
});
