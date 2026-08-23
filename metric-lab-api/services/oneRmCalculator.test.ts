import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RELIABLE_REP_LIMIT, epley1RM, estimateOneRm } from './oneRmCalculator';

describe('epley1RM', () => {
  test('a single rep is the lift itself', () => {
    assert.equal(epley1RM(100, 1), 100 * (1 + 1 / 30));
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

describe('estimateOneRm', () => {
  test('rounds to the nearest half kilo', () => {
    assert.equal(estimateOneRm(100, 5).oneRm, 116.5); // 116.667 raw
    assert.equal(estimateOneRm(100, 1).oneRm, 103.5); // 103.333 raw
  });

  test('accepts numeric strings from a text input', () => {
    assert.equal(estimateOneRm('100' as any, '5' as any).oneRm, 116.5);
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
