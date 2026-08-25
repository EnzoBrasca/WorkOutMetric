import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SessionHistoryRow from '../SessionHistoryRow';

const baseSession = {
  id: 's1',
  startedAt: '2026-01-01T00:00:00.000Z',
  totalVolume: 1000,
  volumeDeltaPct: 5,
  mesocycleWeek: null,
  logs: [
    {
      id: 'l1',
      name: 'A VERY LONG EXERCISE NAME THAT SHOULD NOT WRAP TO TWO LINES',
      completedSets: 3,
      completedReps: 8,
      weight: 100,
    },
  ],
};

// logName has flex:1 with no numberOfLines, so a long exercise name wraps and
// pushes logStats out of vertical center in the row.
describe('SessionHistoryRow', () => {
  it('truncates a long log name to a single line', async () => {
    await render(<SessionHistoryRow session={baseSession} expanded onPress={() => {}} />);
    const logName = screen.getByText(baseSession.logs[0].name);
    expect(logName.props.numberOfLines).toBe(1);
  });
});
