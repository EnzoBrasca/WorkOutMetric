import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import ExerciseSuggestions from '../ExerciseSuggestions';

// Same setup as TargetOverrideEditor's tests: render resolves asynchronously
// here, and interactions only flush inside an async act().
const interact = (fn) => act(async () => { fn(); });

const SUGGESTION = {
  slug: 'bench-press',
  name: 'Bench Press',
  primaryMuscle: 'Chest',
  equipment: 'Barbell',
  appEquipment: 'BARBELL',
};

const CDN_FRAME_1 =
  'https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/bench-press/frame-1.png';

describe('ExerciseSuggestions', () => {
  it('renders each match with the muscle and equipment that identify it', async () => {
    await render(<ExerciseSuggestions suggestions={[SUGGESTION]} onSelect={() => {}} />);

    expect(screen.getByText('Bench Press')).toBeTruthy();
    expect(screen.getByText('Chest · Barbell')).toBeTruthy();
  });

  // The form must stay usable for a name that matches nothing, so an empty
  // list renders no container and no empty state at all.
  it('renders nothing when there is no match', async () => {
    await render(<ExerciseSuggestions suggestions={[]} onSelect={() => {}} />);

    expect(screen.queryByText('Bench Press')).toBeNull();
  });

  it('hands the whole match back on tap, so the caller can fill in equipment too', async () => {
    const onSelect = jest.fn();
    await render(<ExerciseSuggestions suggestions={[SUGGESTION]} onSelect={onSelect} />);

    await interact(() => fireEvent.press(screen.getByText('Bench Press')));

    expect(onSelect).toHaveBeenCalledWith(SUGGESTION);
  });

  it('previews the illustration from the pinned CDN version', async () => {
    await render(<ExerciseSuggestions suggestions={[SUGGESTION]} onSelect={() => {}} />);

    const image = screen.getByTestId('exercise-guide-image');
    // expo-image normalises a string source into [{ uri }].
    expect(image.props.source).toEqual([{ uri: CDN_FRAME_1 }]);
    // Disk-backed, so a movement seen once keeps rendering with no connection.
    expect(image.props.cachePolicy).toBe('memory-disk');
  });

  it('renders a row without an illustration rather than breaking on an unknown slug', async () => {
    await render(
      <ExerciseSuggestions
        suggestions={[{ ...SUGGESTION, slug: 'not-a-real-movement' }]}
        onSelect={() => {}}
      />
    );

    expect(screen.getByText('Bench Press')).toBeTruthy();
    expect(screen.queryByTestId('exercise-guide-image')).toBeNull();
  });
});
