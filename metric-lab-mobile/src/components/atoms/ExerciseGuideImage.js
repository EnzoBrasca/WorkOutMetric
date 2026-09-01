import React from 'react';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/useTheme';
import { guideImageUrl } from '../../utils/exerciseGuide';

// The illustration for an exercise matched to the movement catalog.
//
// Renders nothing without a slug, which is the common case: matching is opt-in
// at creation time, so most exercises have none and every caller can mount this
// unconditionally instead of guarding at the call site.
//
// The image comes from a CDN, not the bundle (see utils/exerciseGuide). expo-image
// caches it to disk on first view, so a movement seen once keeps rendering with
// no connection — which is the state the app is usually in at a gym.
//
// The artwork is PURE WHITE line art on transparency -- every opaque pixel in
// every frame is #FFFFFF, covering about 5% of the canvas. Drawn as-is it is
// invisible on any light surface, which is exactly what happened under the
// light theme (backgroundCard is #f4f4f5 there) and under a custom theme with
// a pale background. So it is tinted rather than drawn: because the source is
// monochrome, recolouring loses nothing and lets one asset read correctly on
// every background the user can pick.
export default function ExerciseGuideImage({ slug, size = 40, frameIndex = 1, tintColor }) {
  const { colors } = useTheme();
  const url = guideImageUrl(slug, frameIndex);
  if (!url) return null;

  return (
    <Image
      testID="exercise-guide-image"
      source={url}
      style={{
        width: size,
        height: size,
      }}
      // Defaults to the body text colour so the illustration sits at the same
      // visual weight as the name beside it, in whichever theme is active.
      tintColor={tintColor ?? colors.textPrimary}
      contentFit="contain"
      // memory-disk rather than the default disk-only: these render inside a
      // scrolling list, where re-reading from disk on every row recycle is
      // visible.
      cachePolicy="memory-disk"
      transition={120}
      // A missing image is not worth an error state — the exercise is fully
      // usable without its picture, so a failed fetch just leaves the space
      // blank instead of showing a broken-image icon.
      onError={() => {}}
      accessibilityIgnoresInvertColors
    />
  );
}
