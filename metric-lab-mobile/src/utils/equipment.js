// What a lift is performed with, and how the weight should be read back.
//
// A bare number is ambiguous for anything that is not a barbell: "20" on a
// dumbbell press could be one 20kg dumbbell or two. The exercise carries an
// equipment tag (exercises.equipment, migration 011) and a unit count, and
// every place that renders a weight asks this module how to label it — so the
// rule lives in exactly one place instead of being restated per screen.

export const EQUIPMENT = {
  BARBELL: 'BARBELL',
  DUMBBELL: 'DUMBBELL',
  CABLE: 'CABLE',
  SMITH: 'SMITH',
  OTHER: 'OTHER',
};

// Barbell first: it is the default for an untagged exercise, which is every
// exercise that existed before equipment did.
export const EQUIPMENT_OPTIONS = [
  { value: EQUIPMENT.BARBELL, labelKey: 'EQUIP_BARBELL' },
  { value: EQUIPMENT.DUMBBELL, labelKey: 'EQUIP_DUMBBELL' },
  { value: EQUIPMENT.CABLE, labelKey: 'EQUIP_CABLE' },
  { value: EQUIPMENT.SMITH, labelKey: 'EQUIP_SMITH' },
  { value: EQUIPMENT.OTHER, labelKey: 'EQUIP_OTHER' },
];

// Held one per hand, or loaded per side. Everything else is a single implement
// carrying the whole load, so the UI never asks how many.
const SPLITTABLE = {
  [EQUIPMENT.DUMBBELL]: { one: 'EQUIP_PER_DUMBBELL', two: 'EQUIP_PER_DUMBBELL_X2' },
  [EQUIPMENT.CABLE]: { one: 'EQUIP_PER_CABLE', two: 'EQUIP_PER_CABLE_X2' },
};

/** Whether this equipment's load can sit on one implement or be split across two. */
export function splitsAcrossUnits(equipment) {
  return Boolean(SPLITTABLE[equipment]);
}

/**
 * The unit count to store. The column only accepts 1 or 2, and equipment that
 * does not split is pinned to 1 — a barbell left at 2 by a stale edit would
 * otherwise render a label the picker never offered.
 */
export function normalizeUnits(equipment, units) {
  if (!splitsAcrossUnits(equipment)) return 1;
  return units === 2 ? 2 : 1;
}

/**
 * The unit shown next to a weight: plain "KG" for a barbell or an untagged
 * exercise, and for the rest the implement the number refers to, so a
 * dumbbell target reads as the weight of ONE dumbbell rather than a total.
 */
export function equipmentWeightLabel(t, equipment, units) {
  const keys = SPLITTABLE[equipment];
  if (!keys) return t('KG');

  return `${t('KG')} · ${t(normalizeUnits(equipment, units) === 2 ? keys.two : keys.one)}`;
}
