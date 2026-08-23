import { parseSets } from '../ExerciseModal';

// parseSets turns the free-text "4x8" the user already types into the routine's
// target_sets / target_reps, so it is what decides whether a new exercise gets
// sensible mesocycle targets or silently falls back to the defaults.
describe('parseSets', () => {
  it('reads the canonical format', () => {
    expect(parseSets('4x8')).toEqual({ targetSets: 4, targetReps: 8 });
  });

  it('tolerates whitespace and an uppercase X', () => {
    expect(parseSets(' 3 X 12 ')).toEqual({ targetSets: 3, targetReps: 12 });
  });

  it('handles multi-digit values', () => {
    expect(parseSets('10x15')).toEqual({ targetSets: 10, targetReps: 15 });
  });

  it('rejects anything that is not sets x reps', () => {
    expect(parseSets('AMRAP')).toBeNull();
    expect(parseSets('4x')).toBeNull();
    expect(parseSets('x8')).toBeNull();
    expect(parseSets('4-8')).toBeNull();
    expect(parseSets('4x8x2')).toBeNull();
  });

  it('rejects empty and nullish input instead of throwing', () => {
    expect(parseSets('')).toBeNull();
    expect(parseSets(null)).toBeNull();
    expect(parseSets(undefined)).toBeNull();
  });
});
