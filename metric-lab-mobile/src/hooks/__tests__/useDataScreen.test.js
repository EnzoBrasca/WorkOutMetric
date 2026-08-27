import { buildMonthlyOneRmComparisonRows, buildRadarAxisLabels, filterLiftsByActiveRoutine } from '../useDataScreen';

// The "1RM COMPARISON" block used to be fed all-time-max-of-recent-sessions
// figures computed server-side. It now needs true calendar-month figures from
// the ?resource=monthly-one-rm endpoint, shaped into rows the existing
// react-native-svg/View bar renderer already knows how to draw (it expects
// {id, name, prev, value} — the same shape the old data source used).
describe('buildMonthlyOneRmComparisonRows', () => {
  const routineExercises = [
    { exercise_id: 'squat-id', exercises: { id: 'squat-id', name: 'SQUAT' } },
    { exercise_id: 'bench-id', exercises: { id: 'bench-id', name: 'BENCH PRESS' } },
  ];

  it('shapes the raw API response into rows for the chart, keeping routine order', () => {
    const raw = [
      { exerciseId: 'squat-id', exerciseName: 'SQUAT', previousMonth: 140, currentMonth: 150 },
      { exerciseId: 'bench-id', exerciseName: 'BENCH PRESS', previousMonth: null, currentMonth: null },
    ];

    expect(buildMonthlyOneRmComparisonRows(raw, routineExercises)).toEqual([
      { id: 'squat-id', name: 'SQUAT', prev: 140, value: 150 },
      // A month with no logged sets still shows the exercise row, defaulted
      // to 0 rather than being dropped.
      { id: 'bench-id', name: 'BENCH PRESS', prev: 0, value: 0 },
    ]);
  });

  it('excludes an exercise absent from the active routine even if the raw API response includes it', () => {
    const raw = [
      { exerciseId: 'squat-id', exerciseName: 'SQUAT', previousMonth: 140, currentMonth: 150 },
      { exerciseId: 'deadlift-id', exerciseName: 'DEADLIFT', previousMonth: 180, currentMonth: 190 },
    ];
    const routineWithoutDeadlift = [
      { exercise_id: 'squat-id', exercises: { id: 'squat-id', name: 'SQUAT' } },
    ];

    const rows = buildMonthlyOneRmComparisonRows(raw, routineWithoutDeadlift);

    expect(rows).toHaveLength(1);
    expect(rows.find((row) => row.id === 'deadlift-id')).toBeUndefined();
  });

  it('falls back to the routine membership name when the API response has no matching entry', () => {
    const rows = buildMonthlyOneRmComparisonRows([], routineExercises);

    expect(rows).toEqual([
      { id: 'squat-id', name: 'SQUAT', prev: 0, value: 0 },
      { id: 'bench-id', name: 'BENCH PRESS', prev: 0, value: 0 },
    ]);
  });

  it('returns an empty array when there is no active routine', () => {
    expect(buildMonthlyOneRmComparisonRows([], [])).toEqual([]);
    expect(buildMonthlyOneRmComparisonRows(undefined, undefined)).toEqual([]);
  });
});

// The radar chart drew its grid, axes and polygons but never rendered a single
// piece of text, so the shape was unreadable: nothing said which spoke was
// which exercise. These cases pin the label geometry -- position, anchoring and
// truncation -- independently of the SVG rendering.
describe('buildRadarAxisLabels', () => {
  const center = 100;
  const radius = 60;
  const offset = 14;
  const opts = { center, radius, offset };

  const lifts = (...names) => names.map((name, i) => ({ id: `id-${i}`, name }));

  it('returns one label per lift, carrying the exercise name', () => {
    const labels = buildRadarAxisLabels(lifts('SQUAT', 'BENCH', 'DEADLIFT'), opts);

    expect(labels).toHaveLength(3);
    expect(labels.map((l) => l.label)).toEqual(['SQUAT', 'BENCH', 'DEADLIFT']);
  });

  it('places the first lift at the top of the circle, centred', () => {
    const [first] = buildRadarAxisLabels(lifts('SQUAT', 'BENCH', 'DEADLIFT', 'ROW'), opts);

    expect(first.x).toBeCloseTo(center, 5);
    // Above the centre: SVG y grows downward.
    expect(first.y).toBeCloseTo(center - (radius + offset), 5);
    expect(first.textAnchor).toBe('middle');
  });

  it('anchors right-hand labels to their start and left-hand labels to their end', () => {
    const [, right, , left] = buildRadarAxisLabels(lifts('TOP', 'RIGHT', 'BOTTOM', 'LEFT'), opts);

    expect(right.x).toBeGreaterThan(center);
    expect(right.textAnchor).toBe('start');

    expect(left.x).toBeLessThan(center);
    expect(left.textAnchor).toBe('end');
  });

  it('nudges the bottom label further down than the top one so neither sits on the chart', () => {
    const [top, , bottom] = buildRadarAxisLabels(lifts('TOP', 'RIGHT', 'BOTTOM', 'LEFT'), opts);

    expect(bottom.dy).toBeGreaterThan(top.dy);
  });

  it('truncates a name too long for the margin instead of letting it run off the canvas', () => {
    const [label] = buildRadarAxisLabels(lifts('ROMANIAN DEADLIFT'), { ...opts, maxChars: 8 });

    expect(label.label.length).toBeLessThanOrEqual(8);
    expect(label.label.endsWith('…')).toBe(true);
  });

  it('leaves a name that already fits untouched', () => {
    const [label] = buildRadarAxisLabels(lifts('SQUAT'), { ...opts, maxChars: 8 });

    expect(label.label).toBe('SQUAT');
  });

  it('returns nothing for an empty lift list rather than dividing by zero', () => {
    expect(buildRadarAxisLabels([], opts)).toEqual([]);
  });
});

// The bar chart below the radar is filtered to the active routine, so a radar
// plotting every exercise in the catalogue made the two charts on one screen
// disagree about their population.
describe('filterLiftsByActiveRoutine', () => {
  const lifts = [
    { id: 'squat-id', name: 'SQUAT', value: 100 },
    { id: 'curl-id', name: 'CURL', value: 20 },
    { id: 'bench-id', name: 'BENCH', value: 80 },
  ];

  it('keeps only the lifts that belong to the routine, in the lifts own order', () => {
    const membership = [
      { exercise_id: 'bench-id' },
      { exercise_id: 'squat-id' },
    ];

    expect(filterLiftsByActiveRoutine(lifts, membership).map((l) => l.id))
      .toEqual(['squat-id', 'bench-id']);
  });

  it('reads the exercise id from the nested membership shape too', () => {
    const membership = [{ exercises: { id: 'curl-id' } }];

    expect(filterLiftsByActiveRoutine(lifts, membership).map((l) => l.id))
      .toEqual(['curl-id']);
  });

  // Membership arrives on a separate request from the stats, so it is briefly
  // undefined. Filtering against nothing there would blank a chart that is
  // about to have data.
  it('leaves the lifts untouched while the routine membership has not loaded', () => {
    expect(filterLiftsByActiveRoutine(lifts, undefined)).toEqual(lifts);
    expect(filterLiftsByActiveRoutine(lifts, null)).toEqual(lifts);
  });

  it('plots nothing for a routine that genuinely has no exercises', () => {
    expect(filterLiftsByActiveRoutine(lifts, [])).toEqual([]);
  });

  it('drops routine exercises that have no stats row rather than plotting them at zero', () => {
    const membership = [{ exercise_id: 'squat-id' }, { exercise_id: 'never-logged-id' }];

    expect(filterLiftsByActiveRoutine(lifts, membership).map((l) => l.id))
      .toEqual(['squat-id']);
  });
});
