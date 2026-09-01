import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

import RoutineFormModal, {
  validateRoutineForm,
  ROUTINE_TYPE_SUGGESTIONS,
  CUSTOM_TYPE,
} from '../RoutineFormModal';

const CATALOG = [
  { id: 'ex-1', name: 'Bench Press', type: 'push' },
  { id: 'ex-2', name: 'Row', type: null },
  { id: 'ex-3', name: 'Squat', type: 'legs' },
];

function renderModal(props = {}) {
  return render(
    <RoutineFormModal
      visible
      onClose={() => {}}
      onSave={() => ({ success: true })}
      catalogOptions={CATALOG}
      isSaving={false}
      {...props}
    />
  );
}

// State updates only flush inside an async act() in this setup, so every
// interaction is wrapped rather than fired bare.
const interact = (fn) => act(async () => { fn(); });

describe('validateRoutineForm', () => {
  it('requires a name', () => {
    expect(validateRoutineForm('   ').name).toBe('VALIDATION_REQUIRED');
  });

  it('accepts any non-empty name', () => {
    expect(validateRoutineForm('Torso')).toEqual({});
  });
});

describe('RoutineFormModal', () => {
  it('suggests the common splits without turning them into an enum', () => {
    // routines.type is a freeform TEXT column (migration 009); these are only
    // shortcuts, which is why CUSTOM exists alongside them.
    expect(ROUTINE_TYPE_SUGGESTIONS).toEqual(['PUSH', 'PULL', 'LEGS', 'ARMS', 'ABS']);
  });

  it('reveals a free-text field only once CUSTOM is picked', async () => {
    await renderModal();

    expect(screen.queryByTestId('routine-custom-type-input')).toBeNull();

    await interact(() =>
      fireEvent(screen.getByTestId('routine-type-picker'), 'valueChange', CUSTOM_TYPE)
    );

    expect(screen.getByTestId('routine-custom-type-input')).toBeTruthy();
  });

  it('lists the whole catalog, unfiltered by exercise type', async () => {
    // An exercise is typed BY being added to a routine, so filtering the
    // picker by exercise.type would hide every unassigned exercise.
    await renderModal();

    expect(screen.getByText('Bench Press')).toBeTruthy();
    expect(screen.getByText('Row')).toBeTruthy();
    expect(screen.getByText('Squat')).toBeTruthy();
  });

  it('saves the typed name, the picked type and the selected exercises', async () => {
    const onSave = jest.fn(() => ({ success: true }));
    await renderModal({ onSave });

    await interact(() =>
      fireEvent.changeText(screen.getByTestId('routine-name-input'), 'Torso')
    );
    await interact(() =>
      fireEvent.changeText(screen.getByTestId('routine-description-input'), 'Pecho y espalda')
    );
    await interact(() => fireEvent.press(screen.getByText('Bench Press')));
    await interact(() => fireEvent.press(screen.getByText('Squat')));
    await interact(() => fireEvent.press(screen.getByText('SAVE')));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Torso',
      type: 'PUSH',
      description: 'Pecho y espalda',
      exerciseIds: ['ex-1', 'ex-3'],
      // Seeded on selection, so ticking a box and saving is enough — the user
      // never has to fill these in to create a routine.
      exerciseTargets: {
        'ex-1': { sets: 3, reps: 8 },
        'ex-3': { sets: 3, reps: 8 },
      },
    });
  });

  it('saves the free-text type when CUSTOM is picked', async () => {
    const onSave = jest.fn(() => ({ success: true }));
    await renderModal({ onSave });

    await interact(() =>
      fireEvent.changeText(screen.getByTestId('routine-name-input'), 'Sábado')
    );
    await interact(() =>
      fireEvent(screen.getByTestId('routine-type-picker'), 'valueChange', CUSTOM_TYPE)
    );
    await interact(() =>
      fireEvent.changeText(screen.getByTestId('routine-custom-type-input'), 'MOVILIDAD')
    );
    await interact(() => fireEvent.press(screen.getByText('SAVE')));

    expect(onSave.mock.calls[0][0].type).toBe('MOVILIDAD');
  });

  it('deselects an exercise on a second tap', async () => {
    const onSave = jest.fn(() => ({ success: true }));
    await renderModal({ onSave });

    await interact(() =>
      fireEvent.changeText(screen.getByTestId('routine-name-input'), 'Torso')
    );
    await interact(() => fireEvent.press(screen.getByText('Bench Press')));
    await interact(() => fireEvent.press(screen.getByText('Bench Press')));
    await interact(() => fireEvent.press(screen.getByText('SAVE')));

    expect(onSave.mock.calls[0][0].exerciseIds).toEqual([]);
  });

  it('refuses to save a routine with no name', async () => {
    const onSave = jest.fn();
    await renderModal({ onSave });

    await interact(() => fireEvent.press(screen.getByText('SAVE')));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('routine-name-error')).toBeTruthy();
  });

  it('prefills name, description and membership in edit mode', async () => {
    await renderModal({
      initialData: {
        id: 'routine-1',
        name: 'Empuje A',
        type: 'PUSH',
        description: 'Pecho y hombro',
        exerciseIds: ['ex-2'],
      },
    });

    expect(screen.getByTestId('routine-name-input').props.value).toBe('Empuje A');
    expect(screen.getByTestId('routine-description-input').props.value).toBe('Pecho y hombro');
    // Exactly one row reopens ticked: the one already in the routine.
    expect(screen.getAllByText('[X]')).toHaveLength(1);
    expect(screen.getAllByText('[ ]')).toHaveLength(2);
  });

  it('reopens an unsuggested type as CUSTOM with its text, instead of retagging it', async () => {
    await renderModal({
      initialData: { id: 'routine-1', name: 'Sábado', type: 'MOVILIDAD', exerciseIds: [] },
    });

    expect(screen.getByTestId('routine-custom-type-input').props.value).toBe('MOVILIDAD');
  });

  it('stays open when the save fails, so the typed form is not lost', async () => {
    const onClose = jest.fn();
    await renderModal({
      initialData: { id: 'routine-1', name: 'Empuje A', type: 'PUSH', exerciseIds: [] },
      onSave: () => ({ success: false }),
      onClose,
    });

    await interact(() => fireEvent.press(screen.getByText('SAVE')));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes once the save succeeds', async () => {
    const onClose = jest.fn();
    await renderModal({
      initialData: { id: 'routine-1', name: 'Empuje A', type: 'PUSH', exerciseIds: [] },
      onSave: () => ({ success: true }),
      onClose,
    });

    await interact(() => fireEvent.press(screen.getByText('SAVE')));

    expect(onClose).toHaveBeenCalled();
  });

  it('caps the routine name input length', async () => {
    await renderModal();

    expect(screen.getByTestId('routine-name-input').props.maxLength).toBe(40);
  });
});

// Editing an exercise's target sets/reps used to live on a button on the Train
// card, which was unreachable during a workout and crashed when tapped. It
// belongs here, where the rest of the routine is administered.
describe('RoutineFormModal target sets and reps', () => {
  it('shows the target inputs only for exercises that are in the routine', async () => {
    await renderModal();

    expect(screen.queryByTestId('routine-target-sets-ex-1')).toBeNull();

    await interact(() => fireEvent.press(screen.getByText('Bench Press')));

    expect(screen.getByTestId('routine-target-sets-ex-1')).toBeTruthy();
    expect(screen.getByTestId('routine-target-reps-ex-1')).toBeTruthy();
    // Untouched rows stay bare.
    expect(screen.queryByTestId('routine-target-sets-ex-3')).toBeNull();
  });

  it('seeds the routine baseline so ticking a box is enough to save', async () => {
    await renderModal();

    await interact(() => fireEvent.press(screen.getByText('Bench Press')));

    expect(screen.getByTestId('routine-target-sets-ex-1').props.value).toBe('3');
    expect(screen.getByTestId('routine-target-reps-ex-1').props.value).toBe('8');
  });

  it('saves the numbers the user typed', async () => {
    const onSave = jest.fn(() => ({ success: true }));
    await renderModal({ onSave });

    await interact(() =>
      fireEvent.changeText(screen.getByTestId('routine-name-input'), 'Torso')
    );
    await interact(() => fireEvent.press(screen.getByText('Bench Press')));
    await interact(() =>
      fireEvent.changeText(screen.getByTestId('routine-target-sets-ex-1'), '5')
    );
    await interact(() =>
      fireEvent.changeText(screen.getByTestId('routine-target-reps-ex-1'), '5')
    );
    await interact(() => fireEvent.press(screen.getByText('SAVE')));

    // Numbers, not the input's text — the API takes integers.
    expect(onSave.mock.calls[0][0].exerciseTargets).toEqual({
      'ex-1': { sets: 5, reps: 5 },
    });
  });

  it('prefills the targets a routine already has', async () => {
    await renderModal({
      initialData: {
        name: 'Torso',
        type: 'PUSH',
        description: '',
        exerciseIds: ['ex-1'],
        exerciseTargets: { 'ex-1': { sets: 4, reps: 6 } },
      },
    });

    expect(screen.getByTestId('routine-target-sets-ex-1').props.value).toBe('4');
    expect(screen.getByTestId('routine-target-reps-ex-1').props.value).toBe('6');
  });

  it('refuses to save a target that is not a positive whole number', async () => {
    const onSave = jest.fn(() => ({ success: true }));
    await renderModal({ onSave });

    await interact(() =>
      fireEvent.changeText(screen.getByTestId('routine-name-input'), 'Torso')
    );
    await interact(() => fireEvent.press(screen.getByText('Bench Press')));
    await interact(() =>
      fireEvent.changeText(screen.getByTestId('routine-target-sets-ex-1'), '0')
    );
    await interact(() => fireEvent.press(screen.getByText('SAVE')));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('routine-targets-error')).toBeTruthy();
  });

  // A target left behind by an unticked exercise is not part of the routine,
  // and sending it would re-add the exercise the user just removed.
  it('does not send targets for an exercise that was unticked', async () => {
    const onSave = jest.fn(() => ({ success: true }));
    await renderModal({ onSave });

    await interact(() =>
      fireEvent.changeText(screen.getByTestId('routine-name-input'), 'Torso')
    );
    await interact(() => fireEvent.press(screen.getByText('Bench Press')));
    await interact(() => fireEvent.press(screen.getByText('Bench Press')));
    await interact(() => fireEvent.press(screen.getByText('SAVE')));

    expect(onSave.mock.calls[0][0].exerciseTargets).toEqual({});
  });
});
