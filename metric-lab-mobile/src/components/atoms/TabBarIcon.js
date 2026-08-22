import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../theme/useTheme';

export function TabBarIcon({ routeName, focused }) {
  const { colors, fonts } = useTheme();
  const color = focused ? colors.primary : colors.textSecondary;

  switch (routeName) {
    case 'Train':
      return (
        <Svg width="20" height="14" viewBox="0 0 20 14" fill={color}>
          <Rect x="0" y="4" width="4" height="6" />
          <Rect x="16" y="4" width="4" height="6" />
          <Rect x="4" y="6" width="12" height="2" />
        </Svg>
      );
    case 'Data':
      return (
        <Svg width="18" height="16" viewBox="0 0 18 16" fill={color}>
          <Rect x="0" y="10" width="4" height="6" />
          <Rect x="7" y="6" width="4" height="10" />
          <Rect x="14" y="2" width="4" height="14" />
        </Svg>
      );
    case 'Config':
      return (
        <Svg width="18" height="16" viewBox="0 0 18 16" fill={color}>
          <Rect x="0" y="1" width="18" height="2" />
          <Rect x="10" y="0" width="4" height="4" />
          <Rect x="0" y="7" width="18" height="2" />
          <Rect x="4" y="6" width="4" height="4" />
          <Rect x="0" y="13" width="18" height="2" />
          <Rect x="12" y="12" width="4" height="4" />
        </Svg>
      );
    case 'Profile':
      return (
        <Svg width="18" height="18" viewBox="0 0 18 18" fill={color}>
          <Rect x="5" y="2" width="8" height="6" />
          <Rect x="2" y="10" width="14" height="8" />
        </Svg>
      );
    default:
      return null;
  }
}
