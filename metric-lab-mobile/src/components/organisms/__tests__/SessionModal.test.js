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
      />
    );
    const title = screen.getByText(`LOG SESSION: ${exercise.name}`);
    expect(title.props.numberOfLines).toBe(1);
    expect(title.props.ellipsizeMode).toBe('tail');
  });

  // Rest belongs to the workout, not to one exercise's numbers. This modal used
  // to repeat the countdown that WorkoutSessionView already shows behind it —
  // both driven by the same useRestTimer instance, so it was one timer drawn
  // twice rather than a second one.
  it('does not offer a rest timer of its own', async () => {
    await render(
      <SessionModal
        visible
        onClose={() => {}}
        onSave={() => {}}
        exercise={exercise}
        onSetOneRm={() => {}}
        isSettingOneRm={false}
      />
    );

    // The literal strings RestTimer renders, so this fails if it comes back.
    expect(screen.queryByText('REST TIMER')).toBeNull();
    expect(screen.queryByText('START REST')).toBeNull();
  });

  // exercise.hasOverride/effectiveTargetSets/effectiveTargetReps are set by
  // useTrainScreen's merge of a local sets/reps override on top of the
  // mesocycle plan target. The completed-sets/reps inputs, and the TARGET
  // line, must reflect that override rather than the plan's own numbers.
  it('prefills completed sets/reps from an override, not from the plan target', async () => {
    const overriddenExercise = {
      ...exercise,
      planTarget: { targetSets: 3, targetReps: 6, targetWeight: 90 },
      hasOverride: true,
      effectiveTargetSets: 5,
      effectiveTargetReps: 5,
    };

    await render(
      <SessionModal
        visible
        onClose={() => {}}
        onSave={() => {}}
        exercise={overriddenExercise}
        onSetOneRm={() => {}}
        isSettingOneRm={false}
      />
    );

    expect(screen.getByText(/TARGET.*5x5/)).toBeTruthy();
    expect(screen.getAllByDisplayValue('5')).toHaveLength(2);
  });

  it('falls back to the plan target when no override is set', async () => {
    const planOnlyExercise = {
      ...exercise,
      planTarget: { targetSets: 3, targetReps: 6, targetWeight: 90 },
      hasOverride: false,
      effectiveTargetSets: 3,
      effectiveTargetReps: 6,
    };

    await render(
      <SessionModal
        visible
        onClose={() => {}}
        onSave={() => {}}
        exercise={planOnlyExercise}
        onSetOneRm={() => {}}
        isSettingOneRm={false}
      />
    );

    expect(screen.getByText(/TARGET.*3x6/)).toBeTruthy();
    expect(screen.getByDisplayValue('3')).toBeTruthy();
    expect(screen.getByDisplayValue('6')).toBeTruthy();
  });
});
