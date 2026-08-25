import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

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

    mesocycles: [],
    activeMesocycleId: null,
    isMesocycleSaving: false,
    mesocycleModalVisible: false,
    pendingDeleteMesocycleId: null,
    handleOpenMesocycleModal: () => {},
    handleCloseMesocycleModal: () => {},
    handleCreateMesocycle: () => {},
    handleActivateMesocycle: () => {},
    handleDeactivateMesocycle: () => {},
    handleDeleteMesocycle: () => {},

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

// Mesocycles are created and managed from Config now — Train keeps only the
// current week and an activate/deactivate control.
const MESOCYCLE = {
  id: 'meso-1',
  name: 'A VERY LONG MESOCYCLE NAME THAT SHOULD NOT WRAP INTO THE ROW ACTIONS',
  current_week: 2,
  total_weeks: 4,
};

describe('ConfigScreen mesocycles section', () => {
  it('says so when there are no mesocycles yet', async () => {
    useConfigScreen.mockReturnValue(baseHookReturn());
    await render(<ConfigScreen />);

    expect(screen.getByText('NO MESOCYCLES YET')).toBeTruthy();
    expect(screen.getByText('NEW MESOCYCLE')).toBeTruthy();
  });

  it('shows the derived week of each block and truncates a long name', async () => {
    useConfigScreen.mockReturnValue(baseHookReturn({ mesocycles: [MESOCYCLE] }));
    await render(<ConfigScreen />);

    const rowName = screen.getByText(MESOCYCLE.name);
    expect(rowName.props.numberOfLines).toBe(1);
    expect(rowName.props.ellipsizeMode).toBe('tail');
    expect(screen.getByText('WK 2/4')).toBeTruthy();
  });

  it('offers ACTIVATE for an inactive block and END for the running one', async () => {
    const handleActivateMesocycle = jest.fn();
    useConfigScreen.mockReturnValue(
      baseHookReturn({ mesocycles: [MESOCYCLE], handleActivateMesocycle })
    );
    const { rerender } = await render(<ConfigScreen />);

    await act(async () => {
      fireEvent.press(screen.getByTestId('mesocycle-toggle-meso-1'));
    });
    expect(handleActivateMesocycle).toHaveBeenCalledWith('meso-1');

    const handleDeactivateMesocycle = jest.fn();
    useConfigScreen.mockReturnValue(
      baseHookReturn({
        mesocycles: [MESOCYCLE],
        activeMesocycleId: 'meso-1',
        handleDeactivateMesocycle,
      })
    );
    await act(async () => {
      rerender(<ConfigScreen />);
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('mesocycle-toggle-meso-1'));
    });
    expect(handleDeactivateMesocycle).toHaveBeenCalled();
  });

  it('asks for a second tap before deleting a block', async () => {
    useConfigScreen.mockReturnValue(
      baseHookReturn({ mesocycles: [MESOCYCLE], pendingDeleteMesocycleId: 'meso-1' })
    );
    await render(<ConfigScreen />);

    expect(screen.getByTestId('mesocycle-delete-meso-1')).toBeTruthy();
    expect(screen.getByText('CONFIRM')).toBeTruthy();
    expect(
      screen.getByText(
        'This permanently deletes the mesocycle. Logged workouts are kept.'
      )
    ).toBeTruthy();
  });

  it('opens the creation form, which no longer asks for a routine', async () => {
    const handleOpenMesocycleModal = jest.fn();
    useConfigScreen.mockReturnValue(baseHookReturn({ handleOpenMesocycleModal }));
    const { rerender } = await render(<ConfigScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('NEW MESOCYCLE'));
    });
    expect(handleOpenMesocycleModal).toHaveBeenCalled();

    useConfigScreen.mockReturnValue(baseHookReturn({ mesocycleModalVisible: true }));
    await act(async () => {
      rerender(<ConfigScreen />);
    });

    expect(screen.getByPlaceholderText('e.g. HYPERTROPHY BLOCK')).toBeTruthy();
    expect(screen.queryByText('ROUTINE')).toBeNull();
  });
});
