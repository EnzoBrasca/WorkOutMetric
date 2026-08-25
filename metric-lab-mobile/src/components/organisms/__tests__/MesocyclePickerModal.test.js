import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

import MesocyclePickerModal from '../MesocyclePickerModal';

const mesocycles = [
  {
    id: 'm1',
    name: 'A VERY LONG MESOCYCLE NAME THAT SHOULD NOT WRAP INTO THE ROW ACTIONS',
    current_week: 1,
    total_weeks: 4,
  },
  { id: 'm2', name: 'BLOCK B', current_week: 3, total_weeks: 6 },
];

function renderPicker(props = {}) {
  return render(
    <MesocyclePickerModal
      visible
      onClose={() => {}}
      mesocycles={mesocycles}
      activeMesocycleId={null}
      onSelect={() => {}}
      {...props}
    />
  );
}

describe('MesocyclePickerModal', () => {
  // rowName has no numberOfLines, so a long mesocycle name wraps and pushes the
  // row's action link out of place.
  it('truncates a long mesocycle name to a single line', async () => {
    await renderPicker();

    const rowName = screen.getByText(mesocycles[0].name);
    expect(rowName.props.numberOfLines).toBe(1);
  });

  it('activates the tapped block', async () => {
    const onSelect = jest.fn();
    await renderPicker({ onSelect });

    await act(async () => {
      fireEvent.press(screen.getByTestId('mesocycle-option-m2'));
    });

    expect(onSelect).toHaveBeenCalledWith('m2');
  });

  it('marks the running block and offers no switch link for it', async () => {
    await renderPicker({ activeMesocycleId: 'm2' });

    expect(screen.getByText('WK 3/6 · ACTIVE')).toBeTruthy();
    // Only the other row still offers to be made active.
    expect(screen.getAllByText('MAKE ACTIVE')).toHaveLength(1);
  });

  // Creating a block lives on ConfigScreen now, so the empty state points there
  // instead of offering a form Train no longer carries.
  it('points at the config tab when there is nothing to activate', async () => {
    await renderPicker({ mesocycles: [] });

    expect(screen.getByText('NO MESOCYCLES YET')).toBeTruthy();
    expect(screen.getByText('CREATE ONE IN THE CONFIG TAB')).toBeTruthy();
    expect(screen.queryByText('NEW MESOCYCLE')).toBeNull();
  });
});
