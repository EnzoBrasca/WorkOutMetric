// Derives the light/dark shadow tints a neumorphic surface needs from
// whatever base color it sits on -- there is no fixed palette here because
// the surface color itself is user-controlled (dark/light/custom theme,
// or a custom background picked in ProfileScreen). Two colors close to the
// surface, one lighter and one darker, read as a soft light source instead
// of a picked shadow color that would clash with a custom background.

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function toHex(n) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

// amount > 0 lightens toward white, amount < 0 darkens toward black.
function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const target = amount > 0 ? 255 : 0;
  const p = Math.abs(amount);
  return `#${toHex(r + (target - r) * p)}${toHex(g + (target - g) * p)}${toHex(b + (target - b) * p)}`;
}

export const NEUMORPHIC_RADIUS = 20;

// Deliberately close to the surface color. A wider spread between the two
// tints reads as a hard edge around the element instead of a soft rise out of
// the background, which is the whole point of the style.
export function neumorphicShadows(surfaceHex) {
  return {
    shadowLight: shade(surfaceHex, 0.1),
    shadowDark: shade(surfaceHex, -0.16),
  };
}
