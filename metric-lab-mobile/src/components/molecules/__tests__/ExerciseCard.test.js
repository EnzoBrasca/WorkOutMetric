import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import ExerciseCard from '../ExerciseCard';

const interact = (fn) => act(async () => { fn(); });

const EXERCISE = {
  id: 'ex-1',
  name: 'Sentadilla',
  week: 'WK 1/4',
  weight: '80',
  sets: '3x8',
};

describe('ExerciseCard', () => {
  it('offers logging, which is all the button ever did', async () => {
    const onLog = jest.fn();
    await render(<ExerciseCard exercise={EXERCISE} onLog={onLog} />);

    await interact(() => fireEvent.press(screen.getByText('LOG')));

    expect(onLog).toHaveBeenCalledWith(EXERCISE);
  });

  // It used to read START, which described nothing it did: starting a workout
  // is the screen's own button, and this only ever opened the logging modal.
  it('no longer offers START', async () => {
    await render(<ExerciseCard exercise={EXERCISE} onLog={() => {}} />);

    expect(screen.queryByText('START')).toBeNull();
  });

  // The button opened a routine-target editor that was unreachable during a
  // workout and crashed when tapped there. Editing targets moved to Routines.
  it('no longer offers EDIT anywhere', async () => {
    await render(
      <ExerciseCard exercise={EXERCISE} onLog={() => {}} onDelete={() => {}} />
    );

    expect(screen.queryByText('EDIT')).toBeNull();
  });

  it('offers DEL where the caller can handle it', async () => {
    const onDelete = jest.fn();
    await render(<ExerciseCard exercise={EXERCISE} onLog={() => {}} onDelete={onDelete} />);

    await interact(() => fireEvent.press(screen.getByText('DEL')));

    expect(onDelete).toHaveBeenCalledWith('ex-1');
  });

  // The session view renders this card without onDelete. Rendering the button
  // there threw "onDelete is not a function" on tap; dropping an exercise from
  // the routine is setup, not training, so it belongs hidden mid-workout.
  it('hides DEL when the caller passes no handler, instead of crashing on tap', async () => {
    await render(<ExerciseCard exercise={EXERCISE} onLog={() => {}} />);

    expect(screen.queryByText('DEL')).toBeNull();
  });

  // Outside a workout the Train screen passes no onLog. Offering it there made
  // logSession auto-start a session through ensureActiveSessionId, and the
  // screen then flipped into the workout view on save — a workout the user
  // never asked to begin.
  it('hides LOG when the caller passes no handler', async () => {
    await render(<ExerciseCard exercise={EXERCISE} onDelete={() => {}} />);

    expect(screen.queryByText('LOG')).toBeNull();
    // The rest of the card still works: this is the setup view, where the
    // routine is edited rather than performed.
    expect(screen.getByText('DEL')).toBeTruthy();
    expect(screen.getByText('Sentadilla')).toBeTruthy();
  });
});

// The safe-area provider is only needed once the walkthrough is open -- the
// sheet is mounted on demand, so a card that is never tapped does not pull it
// in. That is deliberate: these render one per row of a scrolling list.
const GUIDE_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

describe('ExerciseCard illustration', () => {
  const ILLUSTRATED = { ...EXERCISE, guide_slug: 'bench-press' };

  // The source artwork is pure white line art on transparency. It used to be
  // drawn over a backgroundCard fill, which made it invisible under the light
  // theme (#f4f4f5) and under any pale custom background.
  it('tints the thumbnail rather than backing it with a fill', async () => {
    await render(<ExerciseCard exercise={ILLUSTRATED} />);

    const thumbnail = screen.getByTestId('exercise-guide-image');

    expect(thumbnail.props.tintColor).toBeTruthy();
    expect(thumbnail.props.style.backgroundColor).toBeUndefined();
  });

  it('opens the movement walkthrough when the illustration is tapped', async () => {
    const { SafeAreaProvider } = require('react-native-safe-area-context');
    await render(
      <SafeAreaProvider initialMetrics={GUIDE_METRICS}>
        <ExerciseCard exercise={ILLUSTRATED} />
      </SafeAreaProvider>
    );

    expect(screen.queryAllByTestId(/exercise-guide-frame-/)).toHaveLength(0);

    await interact(() => fireEvent.press(screen.getByTestId('exercise-guide-open')));

    expect(screen.getAllByTestId(/exercise-guide-frame-/)).toHaveLength(3);
  });

  // Matching is opt-in, so most exercises carry no slug. They must not leave
  // an invisible tap target where the picture would have been.
  it('offers no illustration and no tap target without a slug', async () => {
    await render(<ExerciseCard exercise={EXERCISE} />);

    expect(screen.queryByTestId('exercise-guide-image')).toBeNull();
    expect(screen.queryByTestId('exercise-guide-open')).toBeNull();
  });
});
