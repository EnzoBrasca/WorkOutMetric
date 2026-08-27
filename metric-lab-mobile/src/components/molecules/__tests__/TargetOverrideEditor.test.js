import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import TargetOverrideEditor from '../TargetOverrideEditor';

// State updates only flush inside an async act() in this setup, so every
// interaction is wrapped rather than fired bare.
const interact = (fn) => act(async () => { fn(); });

describe('TargetOverrideEditor', () => {
  it('shows a plain, non-tappable value when not editable', async () => {
    const onSave = jest.fn();
    await render(
      <TargetOverrideEditor sets={3} reps={8} hasOverride={false} editable={false} onSave={onSave} onReset={() => {}} />
    );

    expect(screen.getByText('3x8')).toBeTruthy();
    // Nothing to tap into an editor with -- pressing the value must not open it.
    await interact(() => fireEvent.press(screen.getByText('3x8')));
    expect(screen.queryByLabelText('SAVE')).toBeNull();
  });

  it('shows the ADJUSTED badge when an override is active', async () => {
    await render(
      <TargetOverrideEditor sets={5} reps={5} hasOverride editable={false} onSave={() => {}} onReset={() => {}} />
    );

    expect(screen.getByText('ADJUSTED')).toBeTruthy();
  });

  it('opens the editor on tap, saves a valid value, and closes', async () => {
    const onSave = jest.fn(() => ({ success: true }));
    await render(
      <TargetOverrideEditor sets={3} reps={8} hasOverride={false} editable onSave={onSave} onReset={() => {}} />
    );

    await interact(() => fireEvent.press(screen.getByText('3x8')));

    const inputs = screen.getAllByDisplayValue(/3|8/);
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    await interact(() => fireEvent.changeText(inputs[0], '5'));
    await interact(() => fireEvent.changeText(inputs[1], '5'));
    await interact(() => fireEvent.press(screen.getByLabelText('SAVE')));

    expect(onSave).toHaveBeenCalledWith('5', '5');
    // Back to display mode.
    expect(screen.queryByLabelText('SAVE')).toBeNull();
  });

  // The controls sit inside a stat cell that is only half a card wide, so they
  // are icon-only by design. The label has to survive for screen readers even
  // though no text is painted -- that split is the whole point of this case.
  it('renders the editor controls as icons carrying accessible labels, not visible text', async () => {
    await render(
      <TargetOverrideEditor sets={5} reps={5} hasOverride editable onSave={() => ({ success: true })} onReset={() => {}} />
    );

    await interact(() => fireEvent.press(screen.getByText('5x5')));

    expect(screen.getByLabelText('SAVE')).toBeTruthy();
    expect(screen.getByLabelText('CANCEL')).toBeTruthy();
    expect(screen.getByLabelText('RESET TO SUGGESTED')).toBeTruthy();

    expect(screen.queryByText('SAVE')).toBeNull();
    expect(screen.queryByText('CANCEL')).toBeNull();
    expect(screen.queryByText('RESET TO SUGGESTED')).toBeNull();
  });

  it('closes without saving when cancelled', async () => {
    const onSave = jest.fn();
    await render(
      <TargetOverrideEditor sets={3} reps={8} hasOverride={false} editable onSave={onSave} onReset={() => {}} />
    );

    await interact(() => fireEvent.press(screen.getByText('3x8')));
    await interact(() => fireEvent.press(screen.getByLabelText('CANCEL')));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('SAVE')).toBeNull();
    expect(screen.getByText('3x8')).toBeTruthy();
  });

  it('shows a validation error and stays open when the store rejects the value', async () => {
    const onSave = jest.fn(() => ({ success: false, error: 'VALIDATION_POSITIVE', field: 'targetSets' }));
    await render(
      <TargetOverrideEditor sets={3} reps={8} hasOverride={false} editable onSave={onSave} onReset={() => {}} />
    );

    await interact(() => fireEvent.press(screen.getByText('3x8')));
    await interact(() => fireEvent.press(screen.getByLabelText('SAVE')));

    expect(screen.getByText('MUST BE GREATER THAN 0')).toBeTruthy();
    // Still editing -- the SAVE control is still there.
    expect(screen.getByLabelText('SAVE')).toBeTruthy();
  });

  it('offers a reset button only when an override is active, and calls onReset', async () => {
    const onReset = jest.fn();
    await render(
      <TargetOverrideEditor sets={5} reps={5} hasOverride editable onSave={() => ({ success: true })} onReset={onReset} />
    );

    await interact(() => fireEvent.press(screen.getByText('5x5')));
    expect(screen.getByLabelText('RESET TO SUGGESTED')).toBeTruthy();

    await interact(() => fireEvent.press(screen.getByLabelText('RESET TO SUGGESTED')));

    expect(onReset).toHaveBeenCalled();
    // Closed back to display mode.
    expect(screen.queryByLabelText('SAVE')).toBeNull();
  });

  it('does not offer a reset button when there is nothing to reset', async () => {
    await render(
      <TargetOverrideEditor sets={3} reps={8} hasOverride={false} editable onSave={() => ({ success: true })} onReset={() => {}} />
    );

    await interact(() => fireEvent.press(screen.getByText('3x8')));

    expect(screen.queryByLabelText('RESET TO SUGGESTED')).toBeNull();
  });
});
