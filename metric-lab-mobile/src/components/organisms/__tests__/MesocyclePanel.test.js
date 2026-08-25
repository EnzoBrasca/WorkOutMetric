import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import MesocyclePanel from '../MesocyclePanel';

const MESOCYCLE = { id: 'm1', name: 'BLOCK A', total_weeks: 4, current_week: 2 };

function renderPanel(props = {}) {
  return render(
    <MesocyclePanel
      activeMesocycle={MESOCYCLE}
      plan={null}
      isPlanLoading={false}
      onChangeWeek={() => {}}
      onEndPress={() => {}}
      onActivatePress={() => {}}
      {...props}
    />
  );
}

// Train keeps ONLY the current week (freely movable) and a small
// activate/deactivate control. Everything else moved to ConfigScreen.
describe('MesocyclePanel', () => {
  it('carries no creation or management affordance', async () => {
    await renderPanel();

    expect(screen.queryByText('NEW MESOCYCLE')).toBeNull();
    expect(screen.queryByText('MESOCYCLES')).toBeNull();
    expect(screen.queryByText('DELETE')).toBeNull();
  });

  it('falls back to the mesocycle\'s derived week until the plan lands', async () => {
    await renderPanel();
    expect(screen.getByText('WEEK 2 / 4')).toBeTruthy();
  });

  it('prefers the week the plan came back for', async () => {
    await renderPanel({ plan: { week: 3, isDeload: true } });

    expect(screen.getByText('WEEK 3 / 4')).toBeTruthy();
    expect(screen.getByText('DELOAD')).toBeTruthy();
  });

  it('moves freely between weeks, which SETS the week rather than previewing it', async () => {
    const onChangeWeek = jest.fn();
    await renderPanel({ onChangeWeek });

    await act(async () => {
      fireEvent.press(screen.getByText('›'));
    });
    expect(onChangeWeek).toHaveBeenCalledWith(3);

    await act(async () => {
      fireEvent.press(screen.getByText('‹'));
    });
    expect(onChangeWeek).toHaveBeenCalledWith(1);
  });

  it('deactivates the running block from the small END control', async () => {
    const onEndPress = jest.fn();
    await renderPanel({ onEndPress });

    await act(async () => {
      fireEvent.press(screen.getByTestId('mesocycle-end'));
    });
    expect(onEndPress).toHaveBeenCalled();
  });

  it('offers activation, not creation, when no block is running', async () => {
    const onActivatePress = jest.fn();
    await renderPanel({ activeMesocycle: null, onActivatePress });

    expect(screen.getByText('NO ACTIVE MESOCYCLE')).toBeTruthy();
    expect(screen.queryByText('START MESOCYCLE')).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByTestId('mesocycle-activate'));
    });
    expect(onActivatePress).toHaveBeenCalled();
  });
});
