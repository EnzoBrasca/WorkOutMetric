import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

import Header from '../Header';

// A long title + the "V{APP_VERSION}" suffix must never push the LOGOUT
// button off screen. React Native defaults flexShrink to 0 (unlike web), so
// the title needs numberOfLines to stay on one line and shrink instead of
// wrapping into the logout button's space.
describe('Header', () => {
  it('truncates the title to a single line', async () => {
    await render(<Header />);
    const title = screen.getByText('METRIC_LAB');
    expect(title.props.numberOfLines).toBe(1);
  });
});
