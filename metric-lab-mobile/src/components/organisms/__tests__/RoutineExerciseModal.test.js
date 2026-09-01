import { validateRoutineExercise } from '../RoutineExerciseModal';

// validateRoutineExercise decides whether "add exercise" can submit: an
// exercise must be picked from the catalog (no more free-text name) and the
// target sets/reps must be positive whole numbers.
//
// There is no edit mode any more. Changing the target of an exercise already
// in a routine moved to the Routines tab, so this modal only ever adds.
describe('validateRoutineExercise', () => {
  it('requires an exercise to be selected', () => {
    const errors = validateRoutineExercise('', '3', '8');
    expect(errors.exercise).toBe('ERROR_EXERCISE_REQUIRED');
  });

  it('passes with a selected exercise and valid sets/reps', () => {
    const errors = validateRoutineExercise('ex-1', '3', '8');
    expect(errors).toEqual({});
  });

  describe('targetSets / targetReps', () => {
    it('rejects empty values as required', () => {
      const errors = validateRoutineExercise('ex-1', '', '');
      expect(errors.targetSets).toBe('VALIDATION_REQUIRED');
      expect(errors.targetReps).toBe('VALIDATION_REQUIRED');
    });

    it('rejects non-integer values', () => {
      const errors = validateRoutineExercise('ex-1', '3.5', '8');
      expect(errors.targetSets).toBe('VALIDATION_INTEGER');
    });

    it('rejects zero and negative values', () => {
      expect(validateRoutineExercise('ex-1', '0', '8').targetSets).toBe(
        'VALIDATION_POSITIVE'
      );
      expect(validateRoutineExercise('ex-1', '3', '-1').targetReps).toBe(
        'VALIDATION_POSITIVE'
      );
    });

    it('accepts valid whole numbers', () => {
      const errors = validateRoutineExercise('ex-1', '4', '10');
      expect(errors.targetSets).toBeUndefined();
      expect(errors.targetReps).toBeUndefined();
    });
  });
});
