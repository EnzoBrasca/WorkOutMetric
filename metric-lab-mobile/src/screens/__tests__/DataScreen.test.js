import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('../../hooks/useDataScreen');
import { useDataScreen } from '../../hooks/useDataScreen';

import DataScreen from '../DataScreen';

// barLabel has a fixed width:48 with no shrink/scale protection, so a
// 4-digit value ("1000KG") or accessibility font scaling can clip it. The
// rest of the app already guards this exact case (see ExerciseCard.js).
describe('DataScreen', () => {
  it('protects the bar label from overflow on large values', async () => {
    useDataScreen.mockReturnValue({
      lifts1rm: [{ id: 'l1', name: 'SQUAT', value: 1000, prev: 900 }],
      compounds: [{ id: 'l1', name: 'SQUAT', value: 1000, prev: 900 }],
      isLoading: false,
      error: null,
      isEmpty: false,
      handleRetry: () => {},
      size: 200,
      center: 100,
      radius: 80,
      getPoint: () => '0,0',
      radarGrid: [],
      radarPolygon: '',
      radarPrevPolygon: '',
    });

    await render(<DataScreen />);
    const label = screen.getByText('1000KG');
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    expect(label.props.minimumFontScale).toBe(0.5);
  });
});
