import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { useTheme } from '../../theme/useTheme';

// One soft-UI building block for every card, button, chip and input in the
// app. 'raised' (default) reads as protruding from the background -- light
// shadow up-left, dark shadow down-right. 'pressed' reads as sunken into it
// -- same two shadows, offsets flipped -- for inputs and the active/selected
// state of a chip or tab, replacing the old hard 1px border + flat fill.
//
// Two nested <Shadow> wrap the actual content: the outer one paints the
// light shadow, the inner one the dark shadow, so both render behind the
// same surface instead of needing one shadow implementation to fake two
// light sources.

// Style properties that place the surface INSIDE ITS PARENT rather than lay
// out its own content. <Shadow> renders an outer container View plus an inner
// wrapper around the children, and only the container is what the parent
// measures -- a margin left on the content becomes dead space inside the
// shadow, and a flex/width/minWidth there is ignored entirely. Splitting them
// out is what keeps a surface the same size the plain View it replaced was.
const OUTER_STYLE_KEYS = new Set([
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'marginHorizontal',
  'marginVertical',
  'marginStart',
  'marginEnd',
  'alignSelf',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'width',
  'minWidth',
  'maxWidth',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
]);

function splitStyle(style) {
  const flat = StyleSheet.flatten(style) || {};
  const outer = {};
  const inner = {};

  Object.keys(flat).forEach((key) => {
    if (OUTER_STYLE_KEYS.has(key)) {
      outer[key] = flat[key];
    } else {
      inner[key] = flat[key];
    }
  });

  return { outer, inner };
}

export default function NeumorphicSurface({
  children,
  variant = 'raised',
  radius,
  backgroundColor,
  style,
  containerStyle,
  // <Shadow> defaults its children to alignSelf: 'flex-start', which collapses
  // every surface to the width of its content. Defaulting this to true is what
  // makes a card, button or input fill its parent the way the plain View it
  // replaced did; it only ever fills the container's own width, so it is safe
  // for surfaces sitting in a row too.
  stretch = true,
}) {
  const { colors } = useTheme();
  const r = radius ?? colors.radius;
  const bg = backgroundColor ?? colors.backgroundAlt ?? colors.background;
  const pressed = variant === 'pressed';
  const { outer, inner } = splitStyle(style);

  // A long, low-opacity falloff: the shadow has to fade into the background
  // rather than draw an edge around the surface. Distance is the blur radius,
  // so a bigger one with a smaller offset and a low alpha reads softer, not
  // heavier.
  const distance = pressed ? 6 : 10;
  const lightOffset = pressed ? [2, 2] : [-3, -3];
  const darkOffset = pressed ? [-2, -2] : [3, 3];

  return (
    <Shadow
      distance={distance}
      offset={lightOffset}
      startColor={`${colors.shadowLight}59`}
      style={{ borderRadius: r }}
      containerStyle={[outer, containerStyle]}
      stretch={stretch}
    >
      <Shadow
        distance={distance}
        offset={darkOffset}
        startColor={`${colors.shadowDark}40`}
        style={{ borderRadius: r }}
        stretch={stretch}
      >
        <View style={[{ backgroundColor: bg, borderRadius: r, overflow: 'hidden' }, inner]}>
          {children}
        </View>
      </Shadow>
    </Shadow>
  );
}
