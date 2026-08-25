import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

import MesocycleModal from '../MesocycleModal';

function renderModal(props = {}) {
  return render(
    <MesocycleModal
      visible
      onClose={() => {}}
      onSave={() => ({ success: true })}
      isSaving={false}
      {...props}
    />
  );
}

// A mesocycle covers every routine now, so there is no routine to pick and no
// routine name for the block to borrow: the name is the required field.
describe('MesocycleModal', () => {
  // Guards the maxLength cap: an unbounded mesocycle name would overflow the
  // layout and the backend record with no client-side guard.
  it('caps the mesocycle name input length', async () => {
    await renderModal();

    const nameInput = screen.getByPlaceholderText('e.g. HYPERTROPHY BLOCK');
    expect(nameInput.props.maxLength).toBe(40);
  });

  it('does not ask for a routine any more', async () => {
    await renderModal();

    expect(screen.queryByText('ROUTINE')).toBeNull();
    expect(screen.queryByText('NO ROUTINES AVAILABLE')).toBeNull();
  });

  it('refuses to submit without a name', async () => {
    const onSave = jest.fn();
    await renderModal({ onSave });

    await act(async () => {
      fireEvent.press(screen.getByText('CREATE'));
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('PLEASE NAME THIS MESOCYCLE')).toBeTruthy();
  });

  it('treats a whitespace-only name as missing', async () => {
    const onSave = jest.fn();
    await renderModal({ onSave });

    await act(async () => {
      fireEvent.changeText(screen.getByPlaceholderText('e.g. HYPERTROPHY BLOCK'), '   ');
    });
    await act(async () => {
      fireEvent.press(screen.getByText('CREATE'));
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('sends a trimmed name and no routine_id', async () => {
    const onSave = jest.fn().mockResolvedValue({ success: true });
    const onClose = jest.fn();
    await renderModal({ onSave, onClose });

    await act(async () => {
      fireEvent.changeText(
        screen.getByPlaceholderText('e.g. HYPERTROPHY BLOCK'),
        '  HYPERTROPHY BLOCK  '
      );
    });
    await act(async () => {
      fireEvent.press(screen.getByText('CREATE'));
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'HYPERTROPHY BLOCK', total_weeks: 4, start_pct: 60 })
    );
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('routine_id');
    expect(onClose).toHaveBeenCalled();
  });
});
