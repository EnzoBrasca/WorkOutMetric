import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('../../hooks/useConfigScreen');
import { useConfigScreen } from '../../hooks/useConfigScreen';

import ConfigScreen from '../ConfigScreen';

const lift = {
  id: 'lift-1',
  name: 'A VERY LONG EXERCISE NAME THAT SHOULD NOT WRAP THE CATALOG CARD LAYOUT',
  type: 'push',
  oneRm: 100,
  isManual: false,
  historyValue: null,
};

function baseHookReturn(overrides = {}) {
  return {
    localLifts: [lift],
    isLoading: false,
    error: null,
    isEmpty: false,
    handleRetry: () => {},

    newExerciseName: '',
    createError: null,
    isCreatingExercise: false,
    handleChangeNewExerciseName: () => {},
    handleCreateExercise: () => {},

    editingId: null,
    renameValue: '',
    handleChangeRenameValue: () => {},
    handleStartRename: () => {},
    handleCancelRename: () => {},
    handleConfirmRename: () => {},

    pendingDeleteId: null,
    handleDeleteExercise: () => {},

    rowInputs: {},
    rowErrors: {},
    estimatingIds: {},
    lowConfidenceByExerciseId: {},
    handleChangeRowWeight: () => {},
    handleChangeRowReps: () => {},
    handleSubmitOneRm: () => {},

    localRestTimerSeconds: '90',
    restTimerError: null,
    handleChangeRestTimerSeconds: () => {},
    ...overrides,
  };
}

// Guards the maxLength/numberOfLines caps on exercise names (create and
// rename) and the liftName truncation, so a future edit can't silently
// remove them.
describe('ConfigScreen', () => {
  it('caps the new-exercise name input length and truncates long lift names', async () => {
    useConfigScreen.mockReturnValue(baseHookReturn());
    await render(<ConfigScreen />);

    const createInput = screen.getByPlaceholderText('e.g. BENCH PRESS');
    expect(createInput.props.maxLength).toBe(40);

    const liftName = screen.getByText(lift.name);
    expect(liftName.props.numberOfLines).toBe(1);
    expect(liftName.props.ellipsizeMode).toBe('tail');
  });

  it('caps the rename input length', async () => {
    useConfigScreen.mockReturnValue(
      baseHookReturn({ editingId: lift.id, renameValue: lift.name })
    );
    await render(<ConfigScreen />);

    const renameInput = screen.getByDisplayValue(lift.name);
    expect(renameInput.props.maxLength).toBe(40);
  });
});
