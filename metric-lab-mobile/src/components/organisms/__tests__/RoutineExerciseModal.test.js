import { validateRoutineExercise } from '../RoutineExerciseModal';

// validateRoutineExercise decides whether "add exercise" / "edit target" can
// submit. In add mode an exercise must be picked from the catalog (no more
// free-text name); in edit mode the exercise is fixed by the already-existing
// routine membership, so only target sets/reps are validated.
describe('validateRoutineExercise', () => {
  describe('add mode (isEditMode = false)', () => {
    it('requires an exercise to be selected', () => {
      const errors = validateRoutineExercise('', '3', '8', false);
      expect(errors.exercise).toBe('ERROR_EXERCISE_REQUIRED');
    });

    it('passes with a selected exercise and valid sets/reps', () => {
      const errors = validateRoutineExercise('ex-1', '3', '8', false);
      expect(errors).toEqual({});
    });
  });

  describe('edit mode (isEditMode = true)', () => {
    it('does not require an exercise id — the membership already fixes it', () => {
      const errors = validateRoutineExercise('', '3', '8', true);
      expect(errors.exercise).toBeUndefined();
    });
  });

  describe('targetSets / targetReps', () => {
    it('rejects empty values as required', () => {
      const errors = validateRoutineExercise('ex-1', '', '', false);
      expect(errors.targetSets).toBe('VALIDATION_REQUIRED');
      expect(errors.targetReps).toBe('VALIDATION_REQUIRED');
    });

    it('rejects non-integer values', () => {
      const errors = validateRoutineExercise('ex-1', '3.5', '8', false);
      expect(errors.targetSets).toBe('VALIDATION_INTEGER');
    });

    it('rejects zero and negative values', () => {
      expect(validateRoutineExercise('ex-1', '0', '8', false).targetSets).toBe(
        'VALIDATION_POSITIVE'
      );
      expect(validateRoutineExercise('ex-1', '3', '-1', false).targetReps).toBe(
        'VALIDATION_POSITIVE'
      );
    });

    it('accepts valid whole numbers', () => {
      const errors = validateRoutineExercise('ex-1', '4', '10', false);
      expect(errors.targetSets).toBeUndefined();
      expect(errors.targetReps).toBeUndefined();
    });
  });
});
