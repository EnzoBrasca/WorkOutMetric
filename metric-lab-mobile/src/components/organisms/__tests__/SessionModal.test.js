import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

import SessionModal from '../SessionModal';

const exercise = {
  id: 'e1',
  name: 'A VERY LONG EXERCISE NAME THAT SHOULD NOT PUSH THE MODAL LAYOUT AROUND',
  sets: '3x8',
};

// The "LOG SESSION: {exercise.name}" title has no truncation guard, so a long
// catalog exercise name can wrap and blow up the modal header.
describe('SessionModal', () => {
  it('truncates a long exercise name in the title', async () => {
    await render(
      <SessionModal
        visible
        onClose={() => {}}
        onSave={() => {}}
        exercise={exercise}
        onSetOneRm={() => {}}
        isSettingOneRm={false}
        restTimer={null}
        restDurationSec={90}
      />
    );
    const title = screen.getByText(`LOG SESSION: ${exercise.name}`);
    expect(title.props.numberOfLines).toBe(1);
    expect(title.props.ellipsizeMode).toBe('tail');
  });
});
