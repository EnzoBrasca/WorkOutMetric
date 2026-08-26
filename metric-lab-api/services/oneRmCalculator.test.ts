import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RELIABLE_REP_LIMIT, epley1RM, brzycki1RM, blendedOneRm, estimateOneRm } from './oneRmCalculator';

describe('epley1RM', () => {
  // Not an estimate: a rep completed at 100kg IS a 100kg single. Epley's
  // algebraic form does not degenerate to the weight at one rep — it returns
  // 103.33 — so the measured case is taken before the regression runs.
  test('a single rep is the lift itself, not an estimate above it', () => {
    assert.equal(epley1RM(100, 1), 100);
    assert.equal(epley1RM(70, 1), 70);
  });

  test('matches the formula statsService has always used', () => {
    // 100kg x 5 -> 100 * (1 + 5/30) = 116.67
    assert.ok(Math.abs(epley1RM(100, 5) - 116.6667) < 0.001);
  });

  test('rises with reps', () => {
    assert.ok(epley1RM(100, 8) > epley1RM(100, 5));
  });

  test('returns 0 rather than NaN for unusable input', () => {
    assert.equal(epley1RM(0, 5), 0);
    assert.equal(epley1RM(100, 0), 0);
    assert.equal(epley1RM(-50, 5), 0);
    assert.equal(epley1RM(NaN, 5), 0);
    assert.equal(epley1RM(100, NaN), 0);
  });
});

describe('brzycki1RM', () => {
  test('a single rep is the lift itself', () => {
    assert.equal(brzycki1RM(100, 1), 100);
  });

  test('matches the published formula', () => {
    // 100kg x 5 -> 100 / (1.0278 - 5*0.0278) = 112.5113
    assert.ok(Math.abs(brzycki1RM(100, 5)! - 112.5113) < 0.001);
  });

  // The formula is a reciprocal, not a line like Epley: it climbs toward
  // infinity as reps approaches 37 rather than growing steadily. At 20 reps
  // it already claims 212kg from a 100kg set — a worse number than Epley's
  // own 166.67, not a more conservative one.
  test('diverges upward much faster than Epley past its reliable range', () => {
    const brzycki20 = brzycki1RM(100, 20)!;
    const epley20 = epley1RM(100, 20);
    assert.ok(brzycki20 > epley20 * 1.2, `expected ${brzycki20} to clear ${epley20 * 1.2}`);
  });

  // Past ~37 reps the denominator goes to zero and then negative — the
  // formula stops meaning anything, so callers must treat this as "no
  // estimate" rather than trust a negative or wildly inflated number.
  test('returns null once reps pass its mathematical domain', () => {
    assert.equal(brzycki1RM(100, 37), null);
    assert.equal(brzycki1RM(100, 50), null);
  });

  test('returns null for unusable input', () => {
    assert.equal(brzycki1RM(0, 5), null);
    assert.equal(brzycki1RM(100, 0), null);
    assert.equal(brzycki1RM(-50, 5), null);
    assert.equal(brzycki1RM(NaN, 5), null);
  });
});

describe('blendedOneRm', () => {
  // Brzycki is only trusted in the same low-rep range the app already treats
  // as reliable (RELIABLE_REP_LIMIT) — blending it in past that range would
  // make the estimate MORE inflated, the opposite of the point.
  test('averages Epley and Brzycki within the reliable rep range', () => {
    // Epley 116.667, Brzycki 112.514 -> 114.59
    assert.ok(Math.abs(blendedOneRm(100, 5) - 114.59) < 0.01);
  });

  test('still averages exactly at the reliable rep limit', () => {
    // Epley 133.333, Brzycki 133.369 -> 133.35
    assert.ok(Math.abs(blendedOneRm(100, RELIABLE_REP_LIMIT) - 133.35) < 0.01);
  });

  test('falls back to Epley alone past the reliable rep limit', () => {
    assert.equal(blendedOneRm(100, RELIABLE_REP_LIMIT + 1), epley1RM(100, RELIABLE_REP_LIMIT + 1));
    assert.equal(blendedOneRm(100, 20), epley1RM(100, 20));
  });

  test('falls back to Epley alone once Brzycki is out of its domain', () => {
    assert.equal(blendedOneRm(100, 50), epley1RM(100, 50));
  });

  test('agrees exactly with both formulas at a single rep', () => {
    assert.equal(blendedOneRm(70, 1), 70);
  });
});

describe('estimateOneRm', () => {
  test('rounds to the nearest half kilo', () => {
    assert.equal(estimateOneRm(100, 5).oneRm, 114.5); // 114.59 blended raw
  });

  // The case that sent a user looking: 70x1 read back as 72.5.
  test('reports a single rep at the weight lifted', () => {
    assert.equal(estimateOneRm(70, 1).oneRm, 70);
    assert.equal(estimateOneRm(102.5, 1).oneRm, 102.5);
  });

  test('accepts numeric strings from a text input', () => {
    assert.equal(estimateOneRm('100' as any, '5' as any).oneRm, 114.5);
  });

  test('trusts a low-rep set', () => {
    assert.equal(estimateOneRm(100, 5).lowConfidence, false);
    assert.equal(estimateOneRm(100, RELIABLE_REP_LIMIT).lowConfidence, false);
  });

  test('flags a set past the reliable rep limit', () => {
    assert.equal(estimateOneRm(100, RELIABLE_REP_LIMIT + 1).lowConfidence, true);
    assert.equal(estimateOneRm(100, 20).lowConfidence, true);
  });

  test('a 20-rep set is inflated enough to be worth warning about', () => {
    // 100 x 20 claims a 166.5kg max. Warning, not refusing, is the point.
    const twenty = estimateOneRm(100, 20);
    assert.equal(twenty.oneRm, 166.5);
    assert.ok(twenty.oneRm / estimateOneRm(100, 5).oneRm > 1.4);
  });

  test('does not flag unusable input as merely low-confidence', () => {
    const none = estimateOneRm(0, 50);
    assert.equal(none.oneRm, 0);
    assert.equal(none.lowConfidence, false);
  });
});
