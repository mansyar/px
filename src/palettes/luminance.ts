/**
 * Colour math shared by ramp derivation and the inspector's highlight-on-white
 * code. WCAG relative luminance, plus a circular hue distance for picking an
 * outline colour.
 */

import type { Rgba } from '../core/palette.js';

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of an opaque colour, 0 (black) to 1 (white). */
export function relativeLuminance(rgba: Rgba): number {
  return 0.2126 * channel(rgba.r) + 0.7152 * channel(rgba.g) + 0.0722 * channel(rgba.b);
}

/**
 * HSL hue in degrees. Achromatic colours report 0: they carry no hue, and the
 * caller's tie-breaks (luminance, then palette order) decide between them.
 */
export function hueOf(rgba: Rgba): number {
  const r = rgba.r / 255;
  const g = rgba.g / 255;
  const b = rgba.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) {
    return 0;
  }
  let hue: number;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }
  const degrees = hue * 60;
  return degrees < 0 ? degrees + 360 : degrees;
}

/** Shortest angular distance between two hues, 0 to 180 degrees. */
export function circularHueDistance(left: number, right: number): number {
  const raw = Math.abs(left - right) % 360;
  return Math.min(raw, 360 - raw);
}
