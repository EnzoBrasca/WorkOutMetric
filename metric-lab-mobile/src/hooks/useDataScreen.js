import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useConfigStore } from '../store/useConfigStore';

export function useDataScreen() {
  const lifts1rm = useConfigStore((state) => state.lifts1rm);
  const loadStats = useConfigStore((state) => state.loadStats);
  const isLoading = useConfigStore((state) => state.isLoading);
  const error = useConfigStore((state) => state.error);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  // Every lift, not a subset. This used to filter `type === 'COMPOUND'`, which
  // only ever matched because statsService hardcoded that string for every
  // exercise. Now that `type` carries the real push/pull tag the filter matched
  // nothing and the comparison section rendered empty — and there is no
  // compound/isolation distinction in the data to filter on anyway.
  const compounds = lifts1rm;
  const maxLift = Math.max(...lifts1rm.map(l => Number(l.value)), 1);

  // Radar Chart calculations
  const size = 280;
  const center = size / 2;
  const radius = (size / 2) - 20;

  const getPoint = (value, angle) => {
    const valRatio = value / maxLift;
    const r = radius * valRatio;
    const x = center + r * Math.cos(angle - Math.PI / 2);
    const y = center + r * Math.sin(angle - Math.PI / 2);
    return `${x},${y}`;
  };

  const radarGrid = [1, 0.75, 0.5, 0.25].map(scale => {
    return lifts1rm.map((_, i) => {
      const angle = (i * 2 * Math.PI) / lifts1rm.length;
      const x = center + radius * scale * Math.cos(angle - Math.PI / 2);
      const y = center + radius * scale * Math.sin(angle - Math.PI / 2);
      return `${x},${y}`;
    }).join(' ');
  });

  const radarPolygon = lifts1rm.map((lift, i) => {
    const angle = (i * 2 * Math.PI) / lifts1rm.length;
    return getPoint(Number(lift.value) || 0, angle);
  }).join(' ');

  const radarPrevPolygon = lifts1rm.map((lift, i) => {
    const angle = (i * 2 * Math.PI) / lifts1rm.length;
    return getPoint(Number(lift.prev) || 0, angle);
  }).join(' ');

  return {
    lifts1rm,
    compounds,
    isLoading,
    error,
    // The radar needs real lifts to plot. Since the invented starter values
    // were removed, a new user genuinely has none and would otherwise be shown
    // an empty chart with no explanation.
    isEmpty: !isLoading && !error && lifts1rm.length === 0,
    handleRetry: loadStats,
    size,
    center,
    radius,
    getPoint,
    radarGrid,
    radarPolygon,
    radarPrevPolygon,
  };
}
