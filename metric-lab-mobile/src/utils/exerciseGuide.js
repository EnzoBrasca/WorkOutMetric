// The illustrated movement catalog, and the translation between its vocabulary
// and ours.
//
// @bryllim/workout-guide ships 302 movements with an image per position. Only
// this module imports it, so the rest of the app deals in a slug and a URL and
// never in the package's own shapes — swapping the catalog later means
// rewriting this file and nothing else.
//
// The images are NOT bundled. They are ~31MB of PNGs served from a version-
// pinned CDN and cached to disk by expo-image on first view, which keeps the
// app's download the size it is today. The tradeoff: an exercise's illustration
// needs one online view before it works offline.

import {
  exercises,
  searchExercises,
  getExercise,
  getAssetUrl,
  normalizeSearchText,
} from '@bryllim/workout-guide';
import { GUIDE_SLUG_BY_SPANISH_NAME } from './exerciseGuideAliases';

// Pinned deliberately. getAssetUrl defaults to the version it was published
// with, so leaving it implicit would silently repoint every cached image the
// day the package is upgraded. Bump this together with package.json.
const ASSET_VERSION = '1.0.0';

// How many suggestions the name field offers. The catalog is small enough to
// search on every keystroke, but a list longer than this covers the keyboard.
const SUGGESTION_LIMIT = 6;

// The catalog tags 17 kinds of equipment; the app offers 5. Three map exactly.
// Everything else — machines, bands, bodyweight, a doorway — becomes OTHER,
// which is what the app already means by "not one of the four we label
// weights for". Note SMITH has no counterpart: the catalog files smith machine
// work under "Machine", so it cannot be told apart from a leg press.
const EQUIPMENT_BY_CATALOG_TAG = {
  Barbell: 'BARBELL',
  Dumbbell: 'DUMBBELL',
  Cable: 'CABLE',
};

/** The app's equipment tag for a catalog entry. */
export function toAppEquipment(catalogEquipment) {
  return EQUIPMENT_BY_CATALOG_TAG[catalogEquipment] ?? 'OTHER';
}

/**
 * Catalog matches for a typed-in exercise name, shaped for the picker.
 *
 * Returns nothing for a blank or near-blank query rather than the first six of
 * all 302: a suggestion list that appears before the user has typed anything
 * meaningful is noise covering the keyboard.
 */
export function suggestExercises(query) {
  if (typeof query !== 'string' || query.trim().length < 2) return [];

  return searchExercises(query).slice(0, SUGGESTION_LIMIT).map((exercise) => ({
    slug: exercise.slug,
    name: exercise.name,
    primaryMuscle: exercise.primaryMuscle,
    equipment: exercise.equipment,
    appEquipment: toAppEquipment(exercise.equipment),
  }));
}

/**
 * The illustration URL for a matched exercise, or null if there is none.
 *
 * Null is the normal case, not an error: most exercises carry no slug, and a
 * slug from a catalog version this app does not have simply will not resolve.
 * Every caller renders nothing for null.
 */
export function guideImageUrl(slug, frameIndex = 1) {
  if (!slug) return null;
  return getAssetUrl(slug, frameIndex, { version: ASSET_VERSION });
}

/** Whether a slug still resolves against the bundled catalog. */
export function isKnownGuideSlug(slug) {
  return Boolean(slug) && getExercise(slug) !== null;
}

// Catalog names by their normalised form, built once. Used only for exact
// matching — see resolveGuideSlug for why ranked search is not.
const SLUG_BY_NORMALISED_NAME = new Map(
  exercises.map((exercise) => [normalizeSearchText(exercise.name), exercise.slug])
);

/**
 * The movement an existing exercise name refers to, or null when unsure.
 *
 * This is the backfill path for exercises created before illustrations existed,
 * and it is deliberately far stricter than the picker: the user is not there to
 * reject a bad guess, so anything less than certain must return null.
 *
 * Ranked search is NOT used here, and that is the whole point. searchExercises
 * ranks "face-pull" above "pull-up" for the query "Pull-up" and returns
 * "spider-curl" for "Curl de biceps" — taking the top hit would not leave
 * exercises unillustrated, it would illustrate them WRONGLY, which is worse:
 * a user who sees a face pull where they logged chin-ups stops trusting every
 * other picture in the app.
 *
 * So only two things count as a match, both exact:
 *   1. the catalog's own name, normalised (covers English-named exercises)
 *   2. a hand-written Spanish alias (see exerciseGuideAliases)
 *
 * Everything else is null, and an exercise with no slug renders exactly as it
 * always has.
 */
export function resolveGuideSlug(name) {
  if (typeof name !== 'string') return null;

  const normalised = normalizeSearchText(name);
  if (!normalised) return null;

  return (
    SLUG_BY_NORMALISED_NAME.get(normalised) ??
    GUIDE_SLUG_BY_SPANISH_NAME[normalised] ??
    null
  );
}

/**
 * Fills in guide_slug for exercises that predate illustrations.
 *
 * Returns a new array, and the SAME array instance when nothing resolved, so a
 * caller can skip a pointless write with a identity check. Exercises that
 * already carry a slug are never touched — a user's own choice in the create
 * form outranks anything inferred here.
 */
export function backfillGuideSlugs(exerciseList) {
  let changed = false;

  const next = exerciseList.map((exercise) => {
    if (exercise.guide_slug) return exercise;

    const slug = resolveGuideSlug(exercise.name);
    if (!slug) return exercise;

    changed = true;
    return { ...exercise, guide_slug: slug };
  });

  return changed ? next : exerciseList;
}
