import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

jest.mock('../../hooks/useRoutinesScreen');
import { useRoutinesScreen } from '../../hooks/useRoutinesScreen';

import RoutinesScreen from '../RoutinesScreen';

const ROUTINES = [
  { id: 'routine-1', name: 'Empuje A', type: 'PUSH', exercise_count: 4, description: null },
  { id: 'routine-2', name: 'Sábado', type: null, exercise_count: 0, description: 'Movilidad' },
];

function baseHookReturn(overrides = {}) {
  return {
    routines: ROUTINES,
    catalogOptions: [{ id: 'ex-1', name: 'Bench Press' }],
    isLoading: false,
    isSaving: false,
    error: null,
    isEmpty: false,
    handleRetry: () => {},

    modalVisible: false,
    editingRoutine: null,
    handleOpenCreate: () => {},
    handleOpenEdit: () => {},
    handleCloseModal: () => {},
    handleSave: () => ({ success: true }),

    pendingDeleteId: null,
    handleDeleteRoutine: () => {},
    ...overrides,
  };
}

const interact = (fn) => act(async () => { fn(); });

describe('RoutinesScreen', () => {
  it('lists every routine with its type badge and exercise count', async () => {
    useRoutinesScreen.mockReturnValue(baseHookReturn());
    await render(<RoutinesScreen />);

    expect(screen.getByText('Empuje A')).toBeTruthy();
    expect(screen.getByText('PUSH')).toBeTruthy();
    expect(screen.getByText(/^4 /)).toBeTruthy();
    // An untagged routine still renders a card rather than being skipped.
    expect(screen.getByText('Sábado')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('opens the editor for the routine whose card was tapped', async () => {
    const handleOpenEdit = jest.fn();
    useRoutinesScreen.mockReturnValue(baseHookReturn({ handleOpenEdit }));
    await render(<RoutinesScreen />);

    await interact(() => fireEvent.press(screen.getAllByText('EDIT')[1]));

    expect(handleOpenEdit).toHaveBeenCalledWith(ROUTINES[1]);
  });

  it('asks for a second tap before deleting', async () => {
    const handleDeleteRoutine = jest.fn();
    useRoutinesScreen.mockReturnValue(baseHookReturn({ handleDeleteRoutine }));
    await render(<RoutinesScreen />);

    await interact(() => fireEvent.press(screen.getAllByText('DEL')[0]));

    expect(handleDeleteRoutine).toHaveBeenCalledWith('routine-1');
  });

  it('marks the card awaiting confirmation instead of deleting silently', async () => {
    useRoutinesScreen.mockReturnValue(baseHookReturn({ pendingDeleteId: 'routine-1' }));
    await render(<RoutinesScreen />);

    expect(screen.getByText('CONFIRM')).toBeTruthy();
    expect(screen.getAllByText('DEL')).toHaveLength(1);
  });

  it('shows the empty state rather than a bare list when there are no routines', async () => {
    useRoutinesScreen.mockReturnValue(baseHookReturn({ routines: [], isEmpty: true }));
    await render(<RoutinesScreen />);

    expect(screen.queryByText('Empuje A')).toBeNull();
    expect(screen.getByText('CREATE ROUTINE')).toBeTruthy();
  });

  it('truncates a long routine name instead of wrapping the card', async () => {
    useRoutinesScreen.mockReturnValue(
      baseHookReturn({
        routines: [
          {
            id: 'routine-1',
            name: 'UNA RUTINA CON UN NOMBRE LARGUÍSIMO QUE NO DEBE ROMPER LA TARJETA',
            type: 'PUSH',
            exercise_count: 1,
          },
        ],
      })
    );
    await render(<RoutinesScreen />);

    const name = screen.getByText(/UNA RUTINA CON UN NOMBRE/);
    expect(name.props.numberOfLines).toBe(1);
  });
});
