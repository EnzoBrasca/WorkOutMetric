import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import RoutineTabs from '../RoutineTabs';

// The Train tabs used to be two hardcoded buttons (PUSH / PULL). They are one
// per user routine now and select by routine id, so nothing here may depend on
// a routine's name.
const ROUTINES = [
  { id: 'routine-1', name: 'Empuje A', type: 'PUSH' },
  { id: 'routine-2', name: 'LEGS', type: 'LEGS' },
  { id: 'routine-3', name: 'Sábado', type: null },
];

describe('RoutineTabs', () => {
  it('renders one tab per routine, labelled by name', async () => {
    await render(<RoutineTabs routines={ROUTINES} activeRoutineId="routine-1" onSelect={() => {}} />);

    expect(screen.getByText('Empuje A')).toBeTruthy();
    expect(screen.getByText('LEGS')).toBeTruthy();
    expect(screen.getByText('Sábado')).toBeTruthy();
  });

  it('selects by routine id, not by label', async () => {
    const onSelect = jest.fn();
    await render(<RoutineTabs routines={ROUTINES} activeRoutineId="routine-1" onSelect={onSelect} />);

    fireEvent.press(screen.getByText('LEGS'));

    expect(onSelect).toHaveBeenCalledWith('routine-2');
  });

  it('badges a routine with its type tag', async () => {
    await render(<RoutineTabs routines={ROUTINES} activeRoutineId="routine-1" onSelect={() => {}} />);

    expect(screen.getByText('PUSH')).toBeTruthy();
  });

  it('does not repeat the type when it just restates the name', async () => {
    await render(<RoutineTabs routines={ROUTINES} activeRoutineId="routine-2" onSelect={() => {}} />);

    // "LEGS" named LEGS would otherwise render as "LEGS / LEGS".
    expect(screen.getAllByText('LEGS')).toHaveLength(1);
  });

  it('lets its container grow with the label instead of pinning a height', async () => {
    await render(<RoutineTabs routines={ROUTINES} activeRoutineId="routine-1" onSelect={() => {}} />);

    const style = StyleSheet.flatten(screen.getByTestId('routine-tabs').props.style);

    expect(style.height).toBeUndefined();
    expect(style.minHeight).toBe(48);
  });

  // The bar measures itself and only then knows how wide a third of it is.
  // fireEvent's 'layout' does not reach the handler under RNTL, so the tests
  // below hand the component the measurement the platform would give it.
  const measureBar = async (width) => {
    const onLayout = screen.getByTestId('routine-tabs').props.onLayout;
    await act(async () => {
      onLayout({ nativeEvent: { layout: { width, height: 48 } } });
    });
  };

  // The bar shows three routines at a time and swipes a whole group, so the
  // snap interval has to be a full page wide -- three tabs plus the gap that
  // trails each one -- or the next group lands mid-tab.
  it('snaps a whole group of three once there are more routines than fit', async () => {
    const many = [...ROUTINES, { id: 'routine-4', name: 'Cuarta', type: null }];
    await render(<RoutineTabs routines={many} activeRoutineId="routine-1" onSelect={() => {}} />);

    await measureBar(320);

    // Three tabs of (320 - 2 gaps) / 3, each trailed by its 8px gap.
    expect(screen.getByTestId('routine-tabs-scroll').props.snapToInterval).toBeCloseTo(328);
  });

  it('leaves the tabs sharing the bar when they all fit on one page', async () => {
    await render(<RoutineTabs routines={ROUTINES} activeRoutineId="routine-1" onSelect={() => {}} />);

    await measureBar(320);

    expect(screen.getByTestId('routine-tabs-scroll').props.snapToInterval).toBeUndefined();
  });

  it('renders nothing when the user has no routines yet', async () => {
    await render(<RoutineTabs routines={[]} activeRoutineId={null} onSelect={() => {}} />);

    expect(screen.queryByTestId('routine-tabs')).toBeNull();
  });
});
