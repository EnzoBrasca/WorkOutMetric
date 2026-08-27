import { useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useConfigStore } from '../store/useConfigStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useMesocycleStore } from '../store/useMesocycleStore';
import { getMonthlyOneRmComparison } from '../api/stats';

// DataScreen's scroll content has 20pt of padding a side, and the radar sits
// inside a card that adds 16pt more. Cap at 280 so it doesn't balloon on
// tablets, and let it shrink below that on narrow phones instead of clipping.
const RADAR_MAX_SIZE = 280;
const RADAR_HORIZONTAL_CHROME = 72;

// The axis labels are drawn OUTSIDE the plot, inside the same fixed Svg canvas,
// so the plot radius has to give up room for them. The old value (20) left
// nowhere to put text, which is why the chart rendered as an unlabelled shape.
const RADAR_LABEL_MARGIN = 44;
const RADAR_LABEL_OFFSET = 12;
const RADAR_LABEL_MAX_CHARS = 10;

/**
 * Positions one text label per radar spoke: where it goes, how it anchors, and
 * how far its baseline needs nudging. Kept pure and separate from the render so
 * the geometry is testable without mounting an Svg.
 */
export function buildRadarAxisLabels(lifts = [], options = {}) {
  const {
    center,
    radius,
    offset = RADAR_LABEL_OFFSET,
    maxChars = RADAR_LABEL_MAX_CHARS,
  } = options;

  const count = lifts?.length ?? 0;
  if (!count) return [];

  const distance = radius + offset;

  return lifts.map((lift, i) => {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const name = lift.name ?? '';

    return {
      key: lift.id ?? `axis-${i}`,
      x: center + distance * cos,
      y: center + distance * sin,
      // Labels hug the circle: the ones on the right grow rightward, the ones
      // on the left grow leftward, and the near-vertical ones stay centred.
      textAnchor: Math.abs(cos) < 0.1 ? 'middle' : cos > 0 ? 'start' : 'end',
      // SVG text sits on its baseline, so every label needs pushing down a
      // little to read as vertically centred -- and further down still at the
      // bottom of the circle, where the baseline would otherwise ride up onto
      // the plot.
      dy: 4 + 4 * sin,
      label: name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name,
    };
  });
}

/**
 * Shapes the raw ?resource=monthly-one-rm response into the rows the
 * "1RM COMPARISON" bar renderer consumes: {id, name, prev, value} — the same
 * shape the old (server-side all-time-max) data source used, so the existing
 * react-native-svg/View render code needs no changes, only its data source.
 *
 * Rows are driven by the active routine's exercise membership, not by the API
 * response: this is what guarantees an exercise outside the active routine
 * never appears here even if the raw response somehow included it, and that
 * an exercise with no logged sets in a month still shows its row (defaulted
 * to 0) instead of being dropped.
 */
export function buildMonthlyOneRmComparisonRows(monthlyOneRm = [], routineExercises = []) {
  const byExerciseId = new Map(
    (monthlyOneRm ?? []).map((entry) => [entry.exerciseId, entry])
  );

  return (routineExercises ?? []).map((membership) => {
    const exerciseId = membership.exercise_id ?? membership.exercises?.id;
    const entry = byExerciseId.get(exerciseId);
    const name = entry?.exerciseName ?? membership.exercises?.name ?? '';

    return {
      id: exerciseId,
      name,
      prev: Number(entry?.previousMonth) || 0,
      value: Number(entry?.currentMonth) || 0,
    };
  });
}

/**
 * Narrows the stats lifts to the ones in the active routine, so the radar and
 * the bar chart below it describe the same set of exercises.
 *
 * Deliberately filters `lifts1rm` rather than reusing the bar chart's monthly
 * rows: the radar reads relative balance, and the monthly figure is 0 for an
 * exercise not trained this month, which would collapse that spoke to the
 * centre and read as a weakness rather than as missing data. The stored
 * reference 1RM does not have that failure mode.
 *
 * A routine exercise with no stats row is dropped for the same reason -- there
 * is no 1RM to plot, and plotting it at zero would invent a weakness.
 */
export function filterLiftsByActiveRoutine(lifts = [], routineExercises) {
  // Membership loads on its own request, so it is briefly absent. Filtering
  // against nothing would blank a chart that is about to have data.
  if (routineExercises == null) return lifts;

  const routineExerciseIds = new Set(
    routineExercises.map((membership) => membership.exercise_id ?? membership.exercises?.id)
  );

  return lifts.filter((lift) => routineExerciseIds.has(lift.id));
}

export function useDataScreen() {
  const { width } = useWindowDimensions();
  const lifts1rm = useConfigStore((state) => state.lifts1rm);
  const loadStats = useConfigStore((state) => state.loadStats);
  const isLoading = useConfigStore((state) => state.isLoading);
  const error = useConfigStore((state) => state.error);

  const activeRoutineId = useWorkoutStore((state) => state.activeRoutineId);
  const activeRoutineDetail = useMesocycleStore((state) => state.activeRoutineDetail);
  const loadRoutineDetail = useMesocycleStore((state) => state.loadRoutineDetail);

  const [monthlyOneRm, setMonthlyOneRm] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadRoutineDetail(activeRoutineId);
    }, [loadStats, loadRoutineDetail, activeRoutineId])
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      if (!activeRoutineId) {
        setMonthlyOneRm([]);
        return undefined;
      }

      getMonthlyOneRmComparison(activeRoutineId)
        .then((data) => {
          if (!cancelled) setMonthlyOneRm(data.comparison ?? []);
        })
        .catch(() => {
          // Keep whatever comparison rows are already on screen rather than
          // blanking them on a transient failure; the screen's error state is
          // already driven by loadStats above.
          if (!cancelled) setMonthlyOneRm([]);
        });

      return () => {
        cancelled = true;
      };
    }, [activeRoutineId])
  );

  // The "1RM COMPARISON" block: previous vs. current calendar month, one row
  // per exercise in the active routine. This replaced the old
  // all-time-max-of-recent-sessions figure (`lifts1rm` with its `.prev`
  // field), which was computed server-side from recent sessions rather than
  // a true calendar-month boundary.
  const compounds = buildMonthlyOneRmComparisonRows(
    monthlyOneRm,
    activeRoutineDetail?.exercises
  );

  // Every radar figure below is driven by the routine-filtered lifts, the
  // normalisation included: scaling the shape by a lift that is not plotted
  // would shrink every visible spoke for no visible reason.
  const radarLifts = filterLiftsByActiveRoutine(lifts1rm, activeRoutineDetail?.exercises);

  const maxLift = Math.max(...radarLifts.map(l => Number(l.value)), 1);

  // Radar Chart calculations
  const size = Math.min(RADAR_MAX_SIZE, width - RADAR_HORIZONTAL_CHROME);
  const center = size / 2;
  const radius = (size / 2) - RADAR_LABEL_MARGIN;

  const getPoint = (value, angle) => {
    const valRatio = value / maxLift;
    const r = radius * valRatio;
    const x = center + r * Math.cos(angle - Math.PI / 2);
    const y = center + r * Math.sin(angle - Math.PI / 2);
    return `${x},${y}`;
  };

  const radarGrid = [1, 0.75, 0.5, 0.25].map(scale => {
    return radarLifts.map((_, i) => {
      const angle = (i * 2 * Math.PI) / radarLifts.length;
      const x = center + radius * scale * Math.cos(angle - Math.PI / 2);
      const y = center + radius * scale * Math.sin(angle - Math.PI / 2);
      return `${x},${y}`;
    }).join(' ');
  });

  const radarPolygon = radarLifts.map((lift, i) => {
    const angle = (i * 2 * Math.PI) / radarLifts.length;
    return getPoint(Number(lift.value) || 0, angle);
  }).join(' ');

  const radarPrevPolygon = radarLifts.map((lift, i) => {
    const angle = (i * 2 * Math.PI) / radarLifts.length;
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
    radarLifts,
    // A routine with nothing plottable would otherwise render a bare canvas
    // under the "EXERCISE BALANCE" heading, which is the same
    // chart-with-no-explanation problem the axis labels just fixed.
    isRadarEmpty: !isLoading && !error && radarLifts.length === 0,
    radarGrid,
    radarPolygon,
    radarPrevPolygon,
    radarAxisLabels: buildRadarAxisLabels(radarLifts, { center, radius }),
  };
}
