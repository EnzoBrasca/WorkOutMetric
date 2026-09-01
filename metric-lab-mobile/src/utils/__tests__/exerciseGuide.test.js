import {
  suggestExercises,
  toAppEquipment,
  guideImageUrl,
  isKnownGuideSlug,
  resolveGuideSlug,
  backfillGuideSlugs,
} from '../exerciseGuide';

describe('toAppEquipment', () => {
  test('maps the three tags both catalogs share', () => {
    expect(toAppEquipment('Barbell')).toBe('BARBELL');
    expect(toAppEquipment('Dumbbell')).toBe('DUMBBELL');
    expect(toAppEquipment('Cable')).toBe('CABLE');
  });

  // The catalog tags 17 kinds of equipment against the app's 5. Anything the
  // app has no weight label for is OTHER rather than dropped, so the exercise
  // still gets created.
  test('falls back to OTHER for everything the app does not label', () => {
    expect(toAppEquipment('Machine')).toBe('OTHER');
    expect(toAppEquipment('Resistance Band')).toBe('OTHER');
    expect(toAppEquipment('Bodyweight')).toBe('OTHER');
    expect(toAppEquipment(undefined)).toBe('OTHER');
  });

  // Smith machine work is filed under the generic "Machine" tag upstream, so a
  // suggestion can never pre-select the app's SMITH option — the user picks it.
  test('cannot produce SMITH, which the catalog does not distinguish', () => {
    expect(toAppEquipment('Machine')).not.toBe('SMITH');
  });
});

describe('suggestExercises', () => {
  test('finds a movement by name and shapes it for the picker', () => {
    const [first] = suggestExercises('bench press');

    expect(first).toEqual(
      expect.objectContaining({
        slug: 'bench-press',
        name: 'Bench Press',
        appEquipment: 'BARBELL',
      })
    );
    expect(first.primaryMuscle).toBeTruthy();
  });

  // A list that appears before the user has typed anything meaningful is noise
  // covering the keyboard, so short queries return nothing at all.
  test('stays silent until the query is worth searching', () => {
    expect(suggestExercises('')).toEqual([]);
    expect(suggestExercises('  ')).toEqual([]);
    expect(suggestExercises('b')).toEqual([]);
    expect(suggestExercises(null)).toEqual([]);
  });

  test('caps the list so it cannot cover the keyboard', () => {
    // "press" matches far more than six movements in the catalog.
    expect(suggestExercises('press').length).toBeLessThanOrEqual(6);
  });

  test('returns nothing for a name that matches no movement', () => {
    expect(suggestExercises('zzzzqqqq')).toEqual([]);
  });
});

describe('guideImageUrl', () => {
  test('pins the asset version rather than following the package default', () => {
    expect(guideImageUrl('push-up')).toBe(
      'https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/push-up/frame-1.png'
    );
  });

  test('addresses a specific position of the movement', () => {
    expect(guideImageUrl('push-up', 2)).toContain('frame-2.png');
  });

  // Null is the ordinary case, not a failure: most exercises carry no slug, and
  // every caller renders nothing for it.
  test('is null for an unmatched or unknown exercise', () => {
    expect(guideImageUrl(null)).toBeNull();
    expect(guideImageUrl(undefined)).toBeNull();
    expect(guideImageUrl('')).toBeNull();
    expect(guideImageUrl('not-a-real-movement')).toBeNull();
  });
});

describe('isKnownGuideSlug', () => {
  test('tells a live slug from one this catalog version lacks', () => {
    expect(isKnownGuideSlug('bench-press')).toBe(true);
    expect(isKnownGuideSlug('not-a-real-movement')).toBe(false);
    expect(isKnownGuideSlug(null)).toBe(false);
  });
});

describe('resolveGuideSlug', () => {
  test('matches a catalog name regardless of case, spacing or hyphens', () => {
    expect(resolveGuideSlug('Bench Press')).toBe('bench-press');
    expect(resolveGuideSlug('BENCH PRESS')).toBe('bench-press');
    expect(resolveGuideSlug('  bench press  ')).toBe('bench-press');
    expect(resolveGuideSlug('PULL UP')).toBe('pull-up');
  });

  test('translates the Spanish names real users type', () => {
    expect(resolveGuideSlug('Press de banca')).toBe('bench-press');
    expect(resolveGuideSlug('SENTADILLA')).toBe('squat');
    expect(resolveGuideSlug('Peso muerto')).toBe('deadlift');
    expect(resolveGuideSlug('Dominadas')).toBe('pull-up');
    expect(resolveGuideSlug('Curl de biceps')).toBe('bicep-curl');
  });

  test('folds the accents users do and do not type', () => {
    expect(resolveGuideSlug('Press francés')).toBe('skull-crusher');
    expect(resolveGuideSlug('Press frances')).toBe('skull-crusher');
    expect(resolveGuideSlug('Elevación de talones')).toBe('standing-calf-raise');
  });

  // The whole reason this exists instead of searchExercises: ranked search puts
  // face-pull above pull-up and answers spider-curl for "Curl de biceps". A
  // wrong illustration is worse than none, so anything uncertain is null.
  test('refuses the wrong answers ranked search would give', () => {
    expect(resolveGuideSlug('Pull-up')).toBe('pull-up');
    expect(resolveGuideSlug('Curl de biceps')).not.toBe('spider-curl');
  });

  test('is null for an ambiguous fragment rather than picking one of many', () => {
    // "curl" alone matches eighteen movements in the catalog.
    expect(resolveGuideSlug('curl')).toBeNull();
    expect(resolveGuideSlug('press')).toBeNull();
    expect(resolveGuideSlug('remo')).toBeNull();
  });

  test('is null for a name it does not know', () => {
    expect(resolveGuideSlug('mi ejercicio raro')).toBeNull();
    expect(resolveGuideSlug('')).toBeNull();
    expect(resolveGuideSlug('   ')).toBeNull();
    expect(resolveGuideSlug(null)).toBeNull();
    expect(resolveGuideSlug(undefined)).toBeNull();
  });
});

describe('backfillGuideSlugs', () => {
  test('fills in the exercises it can identify', () => {
    const result = backfillGuideSlugs([
      { id: '1', name: 'Sentadilla' },
      { id: '2', name: 'Press de banca' },
    ]);

    expect(result[0].guide_slug).toBe('squat');
    expect(result[1].guide_slug).toBe('bench-press');
  });

  // A slug the user chose in the create form is a stated fact; an inferred one
  // is a guess, and a guess must never overwrite the fact.
  test('never overwrites a slug the user already chose', () => {
    const result = backfillGuideSlugs([
      { id: '1', name: 'Sentadilla', guide_slug: 'front-squat' },
    ]);

    expect(result[0].guide_slug).toBe('front-squat');
  });

  test('leaves an unrecognised exercise exactly as it was', () => {
    const original = { id: '1', name: 'Mi invento' };
    const result = backfillGuideSlugs([original]);

    expect(result[0]).toBe(original);
    expect(result[0].guide_slug).toBeUndefined();
  });

  // The caller skips a network write on identity, so returning the same array
  // when nothing changed is part of the contract, not an implementation detail.
  test('returns the very same array when it resolved nothing', () => {
    const input = [{ id: '1', name: 'Mi invento' }];
    expect(backfillGuideSlugs(input)).toBe(input);
  });

  test('returns a new array once anything resolved', () => {
    const input = [{ id: '1', name: 'Sentadilla' }];
    expect(backfillGuideSlugs(input)).not.toBe(input);
  });

  test('handles an empty catalog', () => {
    const input = [];
    expect(backfillGuideSlugs(input)).toBe(input);
  });
});
