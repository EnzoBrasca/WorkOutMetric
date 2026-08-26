import {
  EQUIPMENT,
  EQUIPMENT_OPTIONS,
  splitsAcrossUnits,
  normalizeUnits,
  equipmentWeightLabel,
} from '../equipment';

describe('splitsAcrossUnits', () => {
  // Only these two are held one-per-hand or loaded per side, so only these two
  // ever ask the user how many. A barbell has one bar by definition.
  it('is true for the equipment a load can be split across', () => {
    expect(splitsAcrossUnits(EQUIPMENT.DUMBBELL)).toBe(true);
    expect(splitsAcrossUnits(EQUIPMENT.CABLE)).toBe(true);
  });

  it('is false for equipment with a single implement', () => {
    expect(splitsAcrossUnits(EQUIPMENT.BARBELL)).toBe(false);
    expect(splitsAcrossUnits(EQUIPMENT.SMITH)).toBe(false);
    expect(splitsAcrossUnits(EQUIPMENT.OTHER)).toBe(false);
  });

  // An untagged exercise is every exercise that existed before this feature.
  it('is false when the exercise has no equipment tag', () => {
    expect(splitsAcrossUnits(null)).toBe(false);
    expect(splitsAcrossUnits(undefined)).toBe(false);
    expect(splitsAcrossUnits('')).toBe(false);
  });
});

describe('normalizeUnits', () => {
  it('keeps 1 and 2 for equipment that splits', () => {
    expect(normalizeUnits(EQUIPMENT.DUMBBELL, 1)).toBe(1);
    expect(normalizeUnits(EQUIPMENT.DUMBBELL, 2)).toBe(2);
  });

  // The DB CHECK only allows 1 or 2. Anything else is forced back rather than
  // sent to be rejected.
  it('forces anything outside 1 or 2 back to 1', () => {
    expect(normalizeUnits(EQUIPMENT.CABLE, 3)).toBe(1);
    expect(normalizeUnits(EQUIPMENT.CABLE, 0)).toBe(1);
    expect(normalizeUnits(EQUIPMENT.CABLE, null)).toBe(1);
    expect(normalizeUnits(EQUIPMENT.CABLE, 'dos')).toBe(1);
  });

  // A barbell tagged as 2 units would be a data error the UI never offered:
  // pin it, so a stale value from an edit can't produce a nonsense label.
  it('pins equipment that does not split to a single unit', () => {
    expect(normalizeUnits(EQUIPMENT.BARBELL, 2)).toBe(1);
    expect(normalizeUnits(EQUIPMENT.SMITH, 2)).toBe(1);
    expect(normalizeUnits(null, 2)).toBe(1);
  });
});

describe('equipmentWeightLabel', () => {
  const t = (key) => key;

  // Untagged exercises must read exactly as they did before this feature.
  it('shows a bare unit when there is no equipment', () => {
    expect(equipmentWeightLabel(t, null, 1)).toBe('KG');
    expect(equipmentWeightLabel(t, EQUIPMENT.BARBELL, 1)).toBe('KG');
    expect(equipmentWeightLabel(t, EQUIPMENT.SMITH, 1)).toBe('KG');
  });

  // The whole point: the number is per dumbbell, so say so.
  it('names the implement when the load sits on one of them', () => {
    expect(equipmentWeightLabel(t, EQUIPMENT.DUMBBELL, 1)).toBe('KG · EQUIP_PER_DUMBBELL');
    expect(equipmentWeightLabel(t, EQUIPMENT.CABLE, 1)).toBe('KG · EQUIP_PER_CABLE');
  });

  it('says how many when the load is split across two', () => {
    expect(equipmentWeightLabel(t, EQUIPMENT.DUMBBELL, 2)).toBe('KG · EQUIP_PER_DUMBBELL_X2');
    expect(equipmentWeightLabel(t, EQUIPMENT.CABLE, 2)).toBe('KG · EQUIP_PER_CABLE_X2');
  });

  // A bad units value must not leak into the label.
  it('falls back to the single-implement label for an invalid unit count', () => {
    expect(equipmentWeightLabel(t, EQUIPMENT.DUMBBELL, 7)).toBe('KG · EQUIP_PER_DUMBBELL');
  });
});

describe('EQUIPMENT_OPTIONS', () => {
  it('offers every equipment the picker needs, barbell first', () => {
    expect(EQUIPMENT_OPTIONS.map((option) => option.value)).toEqual([
      EQUIPMENT.BARBELL,
      EQUIPMENT.DUMBBELL,
      EQUIPMENT.CABLE,
      EQUIPMENT.SMITH,
      EQUIPMENT.OTHER,
    ]);
  });

  it('carries a translation key for every option', () => {
    EQUIPMENT_OPTIONS.forEach((option) => {
      expect(typeof option.labelKey).toBe('string');
      expect(option.labelKey.length).toBeGreaterThan(0);
    });
  });
});
