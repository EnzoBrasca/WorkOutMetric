import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

import MesocycleModal from '../MesocycleModal';

const routines = [{ id: 'r1', name: 'Push Day' }];

// Guards the maxLength cap: an unbounded mesocycle name would overflow the
// layout and the backend record with no client-side guard.
describe('MesocycleModal', () => {
  it('caps the mesocycle name input length', async () => {
    await render(
      <MesocycleModal visible onClose={() => {}} onSave={() => {}} routines={routines} isSaving={false} />
    );
    const nameInput = screen.getByPlaceholderText('e.g. HYPERTROPHY BLOCK');
    expect(nameInput.props.maxLength).toBe(40);
  });
});
