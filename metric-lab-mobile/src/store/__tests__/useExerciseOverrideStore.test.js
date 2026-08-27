import AsyncStorage from '@react-native-async-storage/async-storage';
import { useExerciseOverrideStore, resolveOverride, validateOverrideValue } from '../useExerciseOverrideStore';

function resetStore() {
  useExerciseOverrideStore.setState({ overridesByMesocycle: {} });
}

beforeEach(async () => {
  resetStore();
  await AsyncStorage.clear();
});

describe('validateOverrideValue', () => {
  it('rejects an empty value as required', () => {
    expect(validateOverrideValue('')).toBe('VALIDATION_REQUIRED');
    expect(validateOverrideValue(null)).toBe('VALIDATION_REQUIRED');
  });

  it('rejects a non-integer value', () => {
    expect(validateOverrideValue('3.5')).toBe('VALIDATION_INTEGER');
  });

  it('rejects zero and negative values', () => {
    expect(validateOverrideValue('0')).toBe('VALIDATION_POSITIVE');
    expect(validateOverrideValue('-1')).toBe('VALIDATION_POSITIVE');
  });

  it('accepts a positive whole number', () => {
    expect(validateOverrideValue('4')).toBeNull();
    expect(validateOverrideValue(4)).toBeNull();
  });
});

describe('resolveOverride', () => {
  const overridesByMesocycle = {
    'meso-1': { week: 2, exercises: { 'ex-1': { targetSets: 5, targetReps: 5 } } },
  };

  it('returns the override for the exact (mesocycleId, week, exerciseId) tuple', () => {
    expect(resolveOverride(overridesByMesocycle, 'meso-1', 2, 'ex-1')).toEqual({
      targetSets: 5,
      targetReps: 5,
    });
  });

  it('does not inherit the override for a different exercise', () => {
    expect(resolveOverride(overridesByMesocycle, 'meso-1', 2, 'ex-2')).toBeUndefined();
  });

  it('does not inherit the override for a different week of the same mesocycle', () => {
    expect(resolveOverride(overridesByMesocycle, 'meso-1', 3, 'ex-1')).toBeUndefined();
  });

  it('does not inherit the override for a different mesocycle', () => {
    expect(resolveOverride(overridesByMesocycle, 'meso-2', 2, 'ex-1')).toBeUndefined();
  });

  it('returns undefined with no mesocycleId or week', () => {
    expect(resolveOverride(overridesByMesocycle, null, 2, 'ex-1')).toBeUndefined();
    expect(resolveOverride(overridesByMesocycle, 'meso-1', null, 'ex-1')).toBeUndefined();
  });
});

describe('useExerciseOverrideStore.setOverride', () => {
  it('rejects zero/negative/non-integer sets or reps and does not store anything', () => {
    expect(useExerciseOverrideStore.getState().setOverride('meso-1', 2, 'ex-1', '0', '8')).toEqual({
      success: false,
      error: 'VALIDATION_POSITIVE',
      field: 'targetSets',
    });
    expect(useExerciseOverrideStore.getState().setOverride('meso-1', 2, 'ex-1', '3', '-2')).toEqual({
      success: false,
      error: 'VALIDATION_POSITIVE',
      field: 'targetReps',
    });
    expect(useExerciseOverrideStore.getState().setOverride('meso-1', 2, 'ex-1', '3.5', '8')).toEqual({
      success: false,
      error: 'VALIDATION_INTEGER',
      field: 'targetSets',
    });

    expect(useExerciseOverrideStore.getState().overridesByMesocycle).toEqual({});
  });

  it('stores a valid override, retrievable via getOverride', () => {
    const result = useExerciseOverrideStore.getState().setOverride('meso-1', 2, 'ex-1', '5', '5');

    expect(result).toEqual({ success: true });
    expect(useExerciseOverrideStore.getState().getOverride('meso-1', 2, 'ex-1')).toEqual({
      targetSets: 5,
      targetReps: 5,
    });
  });

  it('scopes the override so a different exercise in the same week/mesocycle is unaffected', () => {
    useExerciseOverrideStore.getState().setOverride('meso-1', 2, 'ex-1', '5', '5');

    expect(useExerciseOverrideStore.getState().getOverride('meso-1', 2, 'ex-2')).toBeUndefined();
  });

  it('drops a previous week bucket for the same mesocycle when a new week is written', () => {
    useExerciseOverrideStore.getState().setOverride('meso-1', 2, 'ex-1', '5', '5');
    useExerciseOverrideStore.getState().setOverride('meso-1', 3, 'ex-9', '3', '10');

    // Week 2's override for ex-1 must be gone -- the mesocycle only ever
    // keeps one week's worth of overrides, so advancing (or moving back)
    // a week prunes the stale bucket instead of accumulating forever.
    expect(useExerciseOverrideStore.getState().getOverride('meso-1', 2, 'ex-1')).toBeUndefined();
    expect(useExerciseOverrideStore.getState().getOverride('meso-1', 3, 'ex-9')).toEqual({
      targetSets: 3,
      targetReps: 10,
    });
  });
});

describe('useExerciseOverrideStore.clearOverride', () => {
  it('reverts a single exercise back to the suggested value', () => {
    useExerciseOverrideStore.getState().setOverride('meso-1', 2, 'ex-1', '5', '5');

    useExerciseOverrideStore.getState().clearOverride('meso-1', 2, 'ex-1');

    expect(useExerciseOverrideStore.getState().getOverride('meso-1', 2, 'ex-1')).toBeUndefined();
  });

  it('leaves other overrides in the same week/mesocycle untouched', () => {
    useExerciseOverrideStore.getState().setOverride('meso-1', 2, 'ex-1', '5', '5');
    useExerciseOverrideStore.getState().setOverride('meso-1', 2, 'ex-2', '4', '10');

    useExerciseOverrideStore.getState().clearOverride('meso-1', 2, 'ex-1');

    expect(useExerciseOverrideStore.getState().getOverride('meso-1', 2, 'ex-2')).toEqual({
      targetSets: 4,
      targetReps: 10,
    });
  });

  it('does nothing when there is no override to clear', () => {
    expect(() => useExerciseOverrideStore.getState().clearOverride('meso-1', 2, 'ex-1')).not.toThrow();
    expect(useExerciseOverrideStore.getState().overridesByMesocycle).toEqual({});
  });
});

describe('useExerciseOverrideStore persistence', () => {
  it('round-trips a stored override through AsyncStorage', async () => {
    useExerciseOverrideStore.getState().setOverride('meso-1', 2, 'ex-1', '5', '5');

    // Let zustand's persist middleware flush its write to AsyncStorage.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const raw = await AsyncStorage.getItem('exercise-override-storage');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw).state.overridesByMesocycle['meso-1']).toEqual({
      week: 2,
      exercises: { 'ex-1': { targetSets: 5, targetReps: 5 } },
    });

    // Simulate an app restart: wipe in-memory state, then put the exact bytes
    // this module wrote back into AsyncStorage (clearing in-memory state
    // through the store's own setState would itself persist the clear and
    // overwrite what we are trying to read back) and rehydrate from there.
    resetStore();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useExerciseOverrideStore.getState().getOverride('meso-1', 2, 'ex-1')).toBeUndefined();

    await AsyncStorage.setItem('exercise-override-storage', raw);
    await useExerciseOverrideStore.persist.rehydrate();

    expect(useExerciseOverrideStore.getState().getOverride('meso-1', 2, 'ex-1')).toEqual({
      targetSets: 5,
      targetReps: 5,
    });
  });
});
