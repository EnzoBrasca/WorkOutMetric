import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Button from '../Button';

// Button is used inside flex:1 rows of two (RoutineExerciseModal, SessionModal,
// MesocycleModal, MesocyclePickerModal, LogsScreen). A long label wraps to two
// lines and unevens the row's height unless it's clamped to one line.
describe('Button', () => {
  it('clamps its label to a single line', async () => {
    await render(<Button label="A VERY LONG BUTTON LABEL THAT COULD WRAP" onPress={() => {}} />);
    const label = screen.getByText('A VERY LONG BUTTON LABEL THAT COULD WRAP');
    expect(label.props.numberOfLines).toBe(1);
  });
});
