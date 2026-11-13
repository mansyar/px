/**
 * sRGB ↔ OKLCH (FR-16).
 *
 * Hand-written, no dependency: NFR-2 keeps the runtime dependency count at one.
 * The sRGB transfer function is the exact piecewise form, the linear → OKLab
 * matrices are Ottosson's standard ones, and OKLCH is the polar form of OKLab.
 *
 * Quantising back to 8 bits is part of the contract: the caller writes hex, so
 * an out-of-gamut result is clipped to the sRGB cube rather than re-projected.
 * The round-trip property test in `test/palettes/oklch.test.ts` pins that down.
 */

import type { Rgba } from '../core/palette.js';

export interface Oklch {
  /** Perceptual lightness, 0 (black) to 1 (white). */
  l: number;
  /** Chroma; 0 is grey. */
  c: number;
  /** Hue in degrees, 0-360. Meaningless when `c` is 0. */
  h: number;
}

function clamp01(value: number): number {
  if (value < 0) {
    return 0;
  }
  return Math.min(value, 1);
}

/** sRGB 8-bit channel to linear light. The exact piecewise transfer function. */
export function srgbChannelToLinear(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

/** Linear light to a rounded 8-bit sRGB channel, clipped to the sRGB cube. */
export function linearToSrgbChannel(value: number): number {
  const clamped = clamp01(value);
  const scaled = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(clamp01(scaled) * 255);
}

/** Hue normalised into 0-360. */
export function normaliseHue(degrees: number): number {
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/**
 * Signed shortest arc from `from` to `to`, in (-180, 180]. Rotating along this
 * arc is what keeps a hue shift the smallest one that reaches the target.
 */
export function shortestHueArc(from: number, to: number): number {
  const raw = normaliseHue(to) - normaliseHue(from);
  const wrapped = ((raw + 540) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}

export function rgbaToOklch(rgba: Rgba): Oklch {
  const r = srgbChannelToLinear(rgba.r);
  const g = srgbChannelToLinear(rgba.g);
  const b = srgbChannelToLinear(rgba.b);

  const long = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const medium = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const short = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const lightness = 0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short;
  const a = 1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short;
  const axisB = 0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short;

  const chroma = Math.sqrt(a * a + axisB * axisB);
  // An achromatic colour has no hue to report; 0 is the documented convention
  // everywhere else in the palette code.
  const hue = chroma === 0 ? 0 : normaliseHue((Math.atan2(axisB, a) * 180) / Math.PI);
  return { l: lightness, c: chroma, h: hue };
}

export function oklchToRgba(lch: Oklch): Rgba {
  const radians = (lch.h * Math.PI) / 180;
  const a = lch.c * Math.cos(radians);
  const axisB = lch.c * Math.sin(radians);

  const long = (lch.l + 0.3963377774 * a + 0.2158037573 * axisB) ** 3;
  const medium = (lch.l - 0.1055613458 * a - 0.0638541728 * axisB) ** 3;
  const short = (lch.l - 0.0894841775 * a - 1.291485548 * axisB) ** 3;

  const r = 4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short;
  const g = -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short;
  const b = -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short;

  return {
    r: linearToSrgbChannel(r),
    g: linearToSrgbChannel(g),
    b: linearToSrgbChannel(b),
    a: 255,
  };
}

function hexPair(value: number): string {
  return value.toString(16).padStart(2, '0');
}

export function rgbaToHex(rgba: Rgba): string {
  return `#${hexPair(rgba.r)}${hexPair(rgba.g)}${hexPair(rgba.b)}`;
}

/** OKLCH to the authored form: lowercase `#rrggbb`, alpha dropped (always opaque). */
export function oklchToHex(lch: Oklch): string {
  return rgbaToHex(oklchToRgba(lch));
}
