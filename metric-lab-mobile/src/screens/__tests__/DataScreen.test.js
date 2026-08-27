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
      radarAxisLabels: [],
      radarLifts: [],
      isRadarEmpty: false,
    });

    await render(<DataScreen />);
    const label = screen.getByText('1000KG');
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    expect(label.props.minimumFontScale).toBe(0.5);
  });

  // The radar used to draw its grid, axes and polygons and nothing else, so the
  // chart was a shape with no way to tell which spoke was which exercise. The
  // geometry is unit-tested in useDataScreen; what this guards is the wiring --
  // that the computed labels actually reach the canvas.
  it('draws a label on every radar axis', async () => {
    useDataScreen.mockReturnValue({
      lifts1rm: [
        { id: 'l1', name: 'SQUAT', value: 100, prev: 90 },
        { id: 'l2', name: 'BENCH', value: 80, prev: 70 },
      ],
      compounds: [],
      isLoading: false,
      error: null,
      isEmpty: false,
      handleRetry: () => {},
      size: 200,
      center: 100,
      radius: 56,
      getPoint: () => '0,0',
      radarGrid: [],
      radarPolygon: '',
      radarPrevPolygon: '',
      radarAxisLabels: [
        { key: 'l1', x: 100, y: 32, dy: 0, textAnchor: 'middle', label: 'SQUAT' },
        { key: 'l2', x: 100, y: 168, dy: 8, textAnchor: 'middle', label: 'BENCH' },
      ],
      radarLifts: [
        { id: 'l1', name: 'SQUAT', value: 100, prev: 90 },
        { id: 'l2', name: 'BENCH', value: 80, prev: 70 },
      ],
      isRadarEmpty: false,
    });

    await render(<DataScreen />);

    // react-native-svg wraps a <Text>'s string in a TSpan child, so the label
    // sits one level below the node carrying the testID.
    const labelOf = (testID) => {
      const node = screen.getByTestId(testID);
      return node.props.children?.props?.children ?? node.props.children;
    };

    expect(labelOf('radar-axis-l1')).toBe('SQUAT');
    expect(labelOf('radar-axis-l2')).toBe('BENCH');
  });

  // Now that the radar is filtered to the active routine, a routine whose
  // exercises have no 1RM yet plots nothing. A bare canvas under the heading
  // would repeat the very problem the axis labels fixed.
  it('explains itself instead of drawing an empty radar when the routine has nothing to plot', async () => {
    useDataScreen.mockReturnValue({
      lifts1rm: [{ id: 'l1', name: 'SQUAT', value: 100, prev: 90 }],
      compounds: [],
      isLoading: false,
      error: null,
      isEmpty: false,
      handleRetry: () => {},
      size: 200,
      center: 100,
      radius: 56,
      getPoint: () => '0,0',
      radarGrid: [],
      radarPolygon: '',
      radarPrevPolygon: '',
      radarAxisLabels: [],
      radarLifts: [],
      isRadarEmpty: true,
    });

    await render(<DataScreen />);

    expect(screen.getByText('No 1RM recorded yet for the exercises in this routine.')).toBeTruthy();
  });
});
