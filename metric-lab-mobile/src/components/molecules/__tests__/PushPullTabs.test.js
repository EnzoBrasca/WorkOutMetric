import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import PushPullTabs from '../PushPullTabs';

// The PUSH/PULL switch sits on Config and Train. Its labels scale with the
// system font size while the container does not, so a fixed height clipped
// them once "larger text" was on — the same defect the audit flagged on
// Header, TrainScreen, ConfigScreen and LogsScreen, which it did not list here.
describe('PushPullTabs', () => {
  it('lets its container grow with the label instead of pinning a height', async () => {
    await render(<PushPullTabs activeTab="push" onTabSelect={() => {}} />);

    const container = screen.getByText('PUSH').parent.parent;
    const style = StyleSheet.flatten(container.props.style);

    expect(style.height).toBeUndefined();
    expect(style.minHeight).toBe(48);
  });

  it('renders both tabs', async () => {
    await render(<PushPullTabs activeTab="push" onTabSelect={() => {}} />);

    expect(screen.getByText('PUSH')).toBeTruthy();
    expect(screen.getByText('PULL')).toBeTruthy();
  });
});
