/**
 * OKLCH ramp synthesis (FR-15, FR-16, AC-13).
 *
 * A base colour expands into N tones, listed lightest first, so a synthesised
 * family reads `t0` … `t(n-1)` and derives its shading roles from that order:
 * highlight is `t0`, base is `t(m)`, shadow is `t(n-1)`.
 *
 * The shift rules are deliberately conservative: a uniform luminance step, a
 * clamped chroma that falls off faster on the dark side, and a hue that leans
 * cool below the base and warm above it. Every constant is a named export so
 * the docs and the tests cite the same number.
 */

import { ERROR_HINTS, PxError } from '../core/errors.js';
import { FAMILY_NAME_PATTERN, parseHex } from '../core/palette.js';
import type { Palette, Ramp, RampFamily } from '../core/recipe/types.js';
import { relativeLuminance } from './luminance.js';
import { normaliseHue, type Oklch, oklchToHex, rgbaToOklch, shortestHueArc } from './oklch.js';

/** Luminance change per ramp index, in OKLCH L. A 5-step ramp spans ±0.12. */
export const RAMP_LUMINANCE_STEP = 0.06;

/** A tone never reads as pure black or pure white; both ends keep detail. */
export const RAMP_LUMINANCE_MIN = 0.08;
export const RAMP_LUMINANCE_MAX = 0.98;

/** Chroma is clamped so a saturated base cannot smear into neon. */
export const RAMP_CHROMA_CLAMP = 0.16;

/** Chroma falloff factor per step on the light and the dark side. */
export const RAMP_CHROMA_LIGHT_FALLOFF = 0.1;
export const RAMP_CHROMA_DARK_FALLOFF = 0.2;

/** The falloff factor never drops below this, so shadow tones keep some chroma. */
export const RAMP_CHROMA_FLOOR = 0.35;

/** Below this chroma the input is grey: luminance moves, hue does not. */
export const RAMP_ACHROMATIC_CHROMA = 0.004;

/** Degrees of hue rotation per ramp index, capped by the arc to the target. */
export const RAMP_HUE_ROTATION_PER_STEP = 12;

/** Shadow tones lean toward this hue: cool. */
export const RAMP_COOL_HUE = 250;

/** Highlight tones lean toward this hue: warm. */
export const RAMP_WARM_HUE = 60;

/** How far a monotonicity repair moves a tone's L per attempt. */
export const RAMP_MONOTONIC_NUDGE = 0.004;

/** How far a monotonicity repair may walk one tone down before lifting the ramp. */
export const RAMP_MONOTONIC_SEARCH = 64;

/** How far a repair lifts the whole ramp when the darkest tone has no room left. */
export const RAMP_MONOTONIC_LIFT = 0.02;

/** Attempts allowed before an indistinguishable ramp is reported as a defect. */
export const RAMP_MONOTONIC_ATTEMPTS = 4;

export const MIN_RAMP_STEPS = 3;
export const MAX_RAMP_STEPS = 6;

function clampLuminance(value: number): number {
  if (value < RAMP_LUMINANCE_MIN) {
    return RAMP_LUMINANCE_MIN;
  }
  return Math.min(value, RAMP_LUMINANCE_MAX);
}

/**
 * Where each tone sits relative to the base.
 *
 * The formula is stated dark-first (`d = i - m`); the recipe stores tones
 * lightest first, so position `p` maps to `i = n - 1 - p`. Positive `d` is the
 * light side, negative the dark side.
 */
export function toneOffset(position: number, steps: number): number {
  const middle = Math.floor((steps - 1) / 2);
  return steps - 1 - position - middle;
}

function chromaFactor(offset: number): number {
  if (offset === 0) {
    return 1;
  }
  const falloff =
    offset > 0
      ? 1 - RAMP_CHROMA_LIGHT_FALLOFF * Math.abs(offset)
      : 1 - RAMP_CHROMA_DARK_FALLOFF * Math.abs(offset);
  return Math.max(falloff, RAMP_CHROMA_FLOOR);
}

function rotateToward(hue: number, target: number, degrees: number): number {
  const arc = shortestHueArc(hue, target);
  const amount = Math.min(degrees, Math.abs(arc));
  return normaliseHue(hue + Math.sign(arc) * amount);
}

/** The OKLCH target for every tone, before 8-bit quantisation. */
export function toneTargets(base: Oklch, steps: number): Oklch[] {
  const targets: Oklch[] = [];
  const clampedChroma = Math.min(base.c, RAMP_CHROMA_CLAMP);
  const achromatic = base.c < RAMP_ACHROMATIC_CHROMA;
  for (let position = 0; position < steps; position += 1) {
    const offset = toneOffset(position, steps);
    const hue =
      achromatic || offset === 0
        ? base.h
        : rotateToward(
            base.h,
            offset > 0 ? RAMP_WARM_HUE : RAMP_COOL_HUE,
            RAMP_HUE_ROTATION_PER_STEP * Math.abs(offset),
          );
    targets.push({
      l: clampLuminance(base.l + RAMP_LUMINANCE_STEP * offset),
      c: clampedChroma * chromaFactor(offset),
      h: hue,
    });
  }
  return targets;
}

function luminanceOf(hex: string): number {
  const rgba = parseHex(hex);
  if (rgba === null) {
    throw new PxError('E_INTERNAL', `Synthesised colour "${hex}" is not a hex string`);
  }
  return relativeLuminance(rgba);
}

function isStrictlyMonotonic(hexes: readonly string[]): boolean {
  for (let index = 1; index < hexes.length; index += 1) {
    if (luminanceOf(hexes[index] ?? '#000000') >= luminanceOf(hexes[index - 1] ?? '#000000')) {
      return false;
    }
  }
  return true;
}

/**
 * AC-13 is a guarantee, not a hope: after quantisation every tone is strictly
 * darker than the one before it.
 *
 * A collision only happens where 8-bit sRGB has no room left: the luminance
 * clamp at either end of the range, or a hue/chroma change that lands two tones
 * on the same relative luminance. The repair walks the offending tone's L down
 * one nudge at a time until it is measurably darker, and re-converts it. A very
 * dark base has walled in the whole ramp — every tone sits on the 0.08 floor —
 * so when a tone runs out of room the ramp is lifted and the pass restarts.
 * Four attempts and the colour is simply too cramped to carry that many steps:
 * that is an input limit, so the caller reports it as one rather than as an
 * engine fault.
 *
 * Returns true when the ramp is strictly monotonic, false when this base cannot
 * hold this many distinguishable tones.
 */
function separateTones(targets: Oklch[], hexes: string[]): boolean {
  for (let attempt = 0; attempt <= RAMP_MONOTONIC_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      // The ramp is bunched against the floor: lift it, which moves every tone
      // back into the representable range without changing their spacing.
      targets.forEach((target, index) => {
        target.l = Math.min(1, target.l + RAMP_MONOTONIC_LIFT);
        hexes[index] = oklchToHex(target);
      });
    }
    let exhausted = false;
    for (let index = 1; index < hexes.length && !exhausted; index += 1) {
      let walked = 0;
      while (luminanceOf(hexes[index] ?? '#000000') >= luminanceOf(hexes[index - 1] ?? '#000000')) {
        const target = targets[index];
        if (target === undefined || target.l <= 0 || walked >= RAMP_MONOTONIC_SEARCH) {
          exhausted = true;
          break;
        }
        target.l = Math.max(0, target.l - RAMP_MONOTONIC_NUDGE);
        hexes[index] = oklchToHex(target);
        walked += 1;
      }
    }
    if (!exhausted && isStrictlyMonotonic(hexes)) {
      return true;
    }
  }
  return false;
}

/**
 * The largest step count at or below `ceiling` that this base can carry, or
 * null when even the minimum three tones collapse. This is the number the
 * refusal hint quotes, so a caller learns the base's real ceiling.
 */
export function largestSeparableSteps(baseHex: string, ceiling: number): number | null {
  const rgba = parseHex(baseHex);
  if (rgba === null) {
    return null;
  }
  const base = rgbaToOklch(rgba);
  for (let steps = ceiling; steps >= MIN_RAMP_STEPS; steps -= 1) {
    const targets = toneTargets(base, steps);
    const hexes = targets.map(oklchToHex);
    if (separateTones(targets, hexes)) {
      return steps;
    }
  }
  return null;
}

/**
 * A colour at the edge of the representable range cannot yield `steps` distinct
 * tones. Name the base and the largest count it can actually carry, so the
 * caller knows this is a limit of the input rather than a broken engine.
 */
function unseparableError(baseHex: string, steps: number): PxError {
  const largest = largestSeparableSteps(baseHex, steps - 1);
  const hint =
    largest === null
      ? `Base ${baseHex} cannot carry a strictly monotonic ramp at any step count from ${MIN_RAMP_STEPS} to ${MAX_RAMP_STEPS}; move it away from the black/white ends of the range.`
      : `Base ${baseHex} carries at most ${largest} steps; ask for ${largest} or fewer, or move the base away from the black/white ends of the range.`;
  return new PxError(
    'E_RAMP_UNSEPARABLE',
    `Cannot separate a ${steps}-step ramp from ${baseHex}: too few distinct luminances remain at this lightness`,
    hint,
  );
}

/**
 * Expand a base colour into `steps` tones, lightest first. Steps outside the
 * legal range are the caller's error, not the engine's.
 */
export function synthesizeRamp(baseHex: string, steps: number): string[] {
  if (!Number.isInteger(steps)) {
    throw new PxError(
      'E_BAD_PARAM',
      `Step count "${steps}" is not a whole number`,
      'Pass --steps as an integer from 3 to 6.',
    );
  }
  if (steps < MIN_RAMP_STEPS || steps > MAX_RAMP_STEPS) {
    throw new PxError(
      'E_RAMP_STEPS_RANGE',
      `Step count ${steps} is outside 3-6`,
      ERROR_HINTS.E_RAMP_STEPS_RANGE,
    );
  }
  const rgba = parseHex(baseHex);
  if (rgba === null) {
    throw new PxError(
      'E_BAD_PALETTE',
      `Cannot synthesise a ramp from "${baseHex}": it is not a hex colour`,
      'Pass the base as #rrggbb, e.g. --from "#b13e53".',
    );
  }
  const targets = toneTargets(rgbaToOklch(rgba), steps);
  const hexes = targets.map(oklchToHex);
  if (!separateTones(targets, hexes)) {
    throw unseparableError(baseHex, steps);
  }
  return hexes;
}

/** Parse the `--steps` value: not a number is bad input, out of range is range. */
export function parseStepCount(raw: string | number): number {
  const text = String(raw).trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(text)) {
    throw new PxError(
      'E_BAD_PARAM',
      `Step count "${text}" is not a number`,
      'Pass --steps as an integer from 3 to 6.',
    );
  }
  const value = Number(text);
  if (!Number.isInteger(value)) {
    throw new PxError(
      'E_BAD_PARAM',
      `Step count "${text}" is not a whole number`,
      'Pass --steps as an integer from 3 to 6.',
    );
  }
  if (value < MIN_RAMP_STEPS || value > MAX_RAMP_STEPS) {
    throw new PxError(
      'E_RAMP_STEPS_RANGE',
      `Step count ${value} is outside 3-6`,
      ERROR_HINTS.E_RAMP_STEPS_RANGE,
    );
  }
  return value;
}

function synthesizedFamily(baseHex: string, steps: number): RampFamily {
  const tones = synthesizeRamp(baseHex, steps);
  const ramp: Ramp = {};
  tones.forEach((hex, index) => {
    ramp[`t${index}`] = hex;
  });
  return { ramp };
}

/**
 * Apply one `name=#hex:steps` entry to a palette. `px synthesize` and
 * `px init --synthesize` share this so both produce the same canonical family.
 * An existing family is an error unless forced, which keeps init honest about
 * what its starting palette already defines.
 */
export function synthesizeFamily(palette: Palette, entry: string, force: boolean): Palette {
  const equals = entry.indexOf('=');
  if (equals <= 0) {
    throw new PxError(
      'E_BAD_PARAM',
      `Synthesize entry "${entry}" is not "name=#hex:steps"`,
      'Write --synthesize name=#hex:steps, e.g. --synthesize leaf=#4a8f3c:5.',
    );
  }
  const name = entry.slice(0, equals).trim();
  const spec = entry.slice(equals + 1).trim();
  const colon = spec.lastIndexOf(':');
  if (colon <= 0) {
    throw new PxError(
      'E_BAD_PARAM',
      `Synthesize entry "${entry}" is missing its step count`,
      'Write --synthesize name=#hex:steps, e.g. --synthesize leaf=#4a8f3c:5.',
    );
  }
  const from = spec.slice(0, colon).trim();
  const steps = parseStepCount(spec.slice(colon + 1));
  if (!FAMILY_NAME_PATTERN.test(name)) {
    throw new PxError(
      'E_BAD_PARAM',
      `Family name "${name}" is not valid`,
      'Family names start with a lowercase letter and use lowercase letters, digits or underscores.',
    );
  }
  if (!force && palette[name] !== undefined) {
    throw new PxError(
      'E_FAMILY_EXISTS',
      `Palette family "${name}" already exists`,
      'Pick a new family name, or pass --force to overwrite it.',
    );
  }
  return { ...palette, [name]: synthesizedFamily(from, steps) };
}
