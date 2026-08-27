import { resolveEffectiveTarget } from '../useTrainScreen';

// This is the single merge point for what a card/session shows as the
// exercise's target: an override (this local edit, scoped to the current
// mesocycle week) beats the mesocycle plan's calculated target, which beats
// the routine membership's raw target_sets/target_reps.
describe('resolveEffectiveTarget', () => {
  const membership = { target_sets: 3, target_reps: 8 };
  const planTarget = { targetSets: 3, targetReps: 6, targetWeight: 92.5 };

  it('falls back to the routine membership target with no plan and no override', () => {
    expect(resolveEffectiveTarget(membership, undefined, undefined)).toEqual({
      targetSets: 3,
      targetReps: 8,
      hasOverride: false,
    });
  });

  it('prefers the mesocycle plan target over the raw membership target', () => {
    expect(resolveEffectiveTarget(membership, planTarget, undefined)).toEqual({
      targetSets: 3,
      targetReps: 6,
      hasOverride: false,
    });
  });

  it('prefers the override over the plan target', () => {
    const override = { targetSets: 5, targetReps: 5 };

    expect(resolveEffectiveTarget(membership, planTarget, override)).toEqual({
      targetSets: 5,
      targetReps: 5,
      hasOverride: true,
    });
  });

  it('prefers the override over the raw membership target when there is no plan', () => {
    const override = { targetSets: 4, targetReps: 12 };

    expect(resolveEffectiveTarget(membership, undefined, override)).toEqual({
      targetSets: 4,
      targetReps: 12,
      hasOverride: true,
    });
  });
});
