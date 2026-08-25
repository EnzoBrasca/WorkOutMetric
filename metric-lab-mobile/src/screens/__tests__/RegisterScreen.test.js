import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

import RegisterScreen from '../RegisterScreen';

const navigation = { navigate: jest.fn() };

// title has fontSize:42 with no cap, so large accessibility font scaling
// blows it up disproportionately.
describe('RegisterScreen', () => {
  it('caps the title font scale', async () => {
    await render(<RegisterScreen navigation={navigation} />);
    const title = screen.getByText('METRIC_LAB');
    expect(title.props.maxFontSizeMultiplier).toBe(1.3);
  });
});
