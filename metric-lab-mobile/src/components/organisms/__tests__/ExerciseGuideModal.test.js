import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ExerciseGuideModal from '../ExerciseGuideModal';

// The sheet reads the safe-area inset for its bottom padding, so it needs a
// provider with fixed metrics rather than a real device measurement.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderModal = (props) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ExerciseGuideModal visible onClose={() => {}} exerciseName="Bench Press" {...props} />
    </SafeAreaProvider>
  );

const CDN = 'https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/bench-press';

describe('ExerciseGuideModal', () => {
  it('shows every frame of the movement, in order', async () => {
    await renderModal({ slug: 'bench-press' });

    const frames = screen.getAllByTestId(/exercise-guide-frame-/);

    expect(frames).toHaveLength(3);
    // expo-image normalises `source` to an array of descriptors, even when it
    // was handed a single URL string.
    expect(frames.map((frame) => frame.props.source[0].uri)).toEqual([
      `${CDN}/frame-1.png`,
      `${CDN}/frame-2.png`,
      `${CDN}/frame-3.png`,
    ]);
  });

  it('numbers the steps so the order is readable, not just implied', async () => {
    await renderModal({ slug: 'bench-press' });

    expect(screen.getByText('STEP 1/3')).toBeTruthy();
    expect(screen.getByText('STEP 3/3')).toBeTruthy();
  });

  // The source artwork is pure white line art on transparency. Drawn untinted
  // it disappears against any pale surface -- which is exactly how it vanished
  // under the light theme. Every frame must therefore carry a tint.
  it('tints every frame, because the artwork is white on transparency', async () => {
    await renderModal({ slug: 'bench-press' });

    screen.getAllByTestId(/exercise-guide-frame-/).forEach((frame) => {
      expect(frame.props.tintColor).toBeTruthy();
    });
  });

  it('carries the attribution the illustrations are licensed under', async () => {
    await renderModal({ slug: 'bench-press' });

    expect(screen.getByText(/CC BY-SA 4\.0/)).toBeTruthy();
  });

  // A slug the catalog no longer knows is not an error state: the exercise is
  // fully usable without pictures, so the sheet just has nothing to show.
  it('renders no frames for a slug the catalog does not know', async () => {
    await renderModal({ slug: 'not-a-real-movement' });

    expect(screen.queryAllByTestId(/exercise-guide-frame-/)).toHaveLength(0);
  });
});
