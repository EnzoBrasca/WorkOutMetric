import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

import MesocycleListModal from '../MesocycleListModal';

const mesocycles = [
  {
    id: 'm1',
    name: 'A VERY LONG MESOCYCLE NAME THAT SHOULD NOT WRAP INTO THE ROW ACTIONS',
    current_week: 1,
    total_weeks: 4,
  },
];

// rowName has no numberOfLines, so a long mesocycle name wraps and pushes the
// row's action links (switch/delete) out of place.
describe('MesocycleListModal', () => {
  it('truncates a long mesocycle name to a single line', async () => {
    await render(
      <MesocycleListModal
        visible
        onClose={() => {}}
        mesocycles={mesocycles}
        activeMesocycleId={null}
        onSelect={() => {}}
        onDelete={() => {}}
        onCreatePress={() => {}}
      />
    );
    const rowName = screen.getByText(mesocycles[0].name);
    expect(rowName.props.numberOfLines).toBe(1);
  });
});
