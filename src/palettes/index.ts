/**
 * Curated flat palettes (FR-4) and the deterministic ramp lift (FR-4,
 * `--derive-ramps`).
 *
 * The colour lists are the canonical ones — no approximations, no extra shades.
 * A flat list has no roles, so `ramp_fill` and `auto_shade` would raise
 * `E_NO_RAMP`; `deriveRamps` lifts it into families using only the colours that
 * are already there. Nothing is synthesised and nothing is interpolated: a
 * colour at either end of the luminance range simply lacks that role.
 */

import { PxError } from '../core/errors.js';
import { parseHex, type Rgba } from '../core/palette.js';
import type { Palette, RampRole } from '../core/recipe/types.js';
import { circularHueDistance, hueOf, relativeLuminance } from './luminance.js';

export const DERIVATION_NOTE =
  'Derived ramps follow palette order: each colour is the base of its own family; shadow is the nearest lower-luminance colour, highlight the nearest higher-luminance colour, and outline the lower-luminance colour with the smallest circular hue distance (ties: lower luminance, then palette order). Colours at either end lack that role.';

export interface PaletteDefinition {
  name: string;
  description: string;
  colors: string[];
}

export const PALETTES: Record<string, PaletteDefinition> = {
  pico8: {
    name: 'pico8',
    description: 'PICO-8, 16 colours.',
    colors: [
      '#000000',
      '#1d2b53',
      '#7e2553',
      '#008751',
      '#ab5236',
      '#5f574f',
      '#c2c3c7',
      '#fff1e8',
      '#ff004d',
      '#ffa300',
      '#ffec27',
      '#00e436',
      '#29adff',
      '#83769c',
      '#ff77a8',
      '#ffccaa',
    ],
  },
  endesga32: {
    name: 'endesga32',
    description: 'Endesga 32, 32 colours.',
    colors: [
      '#be4a2f',
      '#d77643',
      '#ead4aa',
      '#e4a672',
      '#b86f50',
      '#733e39',
      '#3e2731',
      '#a22633',
      '#e43b44',
      '#f77622',
      '#feae34',
      '#fee761',
      '#63c74d',
      '#3e8948',
      '#265c42',
      '#193c3e',
      '#124e89',
      '#0099db',
      '#2ce8f5',
      '#ffffff',
      '#c0cbdc',
      '#8b9bb4',
      '#5a6988',
      '#3a4466',
      '#262b44',
      '#181425',
      '#ff0044',
      '#68386c',
      '#b55088',
      '#f6757a',
      '#e8b796',
      '#c28569',
    ],
  },
  arne16: {
    name: 'arne16',
    description: 'Arne 16, 16 colours.',
    colors: [
      '#000000',
      '#9d9d9d',
      '#ffffff',
      '#be2633',
      '#e06f8b',
      '#493c2b',
      '#a46422',
      '#eb8931',
      '#f7e26b',
      '#2f484e',
      '#44891a',
      '#a3ce27',
      '#1b2632',
      '#005784',
      '#31a2f2',
      '#b2dcef',
    ],
  },
  gameboy: {
    name: 'gameboy',
    description: 'Game Boy DMG, 4 shades.',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  },
};

export const PALETTE_NAMES: readonly string[] = Object.keys(PALETTES);

export function paletteByName(name: string): PaletteDefinition | undefined {
  return PALETTES[name.toLowerCase()];
}

interface Point {
  hex: string;
  rgba: Rgba;
  luminance: number;
  hue: number;
  index: number;
}

function pointsOf(colors: readonly string[]): Point[] {
  return colors.map((hex, index) => {
    const rgba = parseHex(hex);
    if (rgba === null) {
      throw new PxError(
        'E_BAD_PALETTE',
        `Palette colour "${hex}" is not a hex colour`,
        'Use #rrggbb or #rrggbbaa.',
      );
    }
    return { hex, rgba, luminance: relativeLuminance(rgba), hue: hueOf(rgba), index };
  });
}

function nearestLower(base: Point, sorted: Point[]): Point | undefined {
  let found: Point | undefined;
  for (const point of sorted) {
    if (point.luminance < base.luminance) {
      found = point;
    }
  }
  return found;
}

function nearestHigher(base: Point, sorted: Point[]): Point | undefined {
  return sorted.find((point) => point.luminance > base.luminance);
}

/**
 * Outline is any lower-luminance colour, judged by hue rather than by distance:
 * ties go to the darker colour, then to the earlier palette entry.
 */
function outlineFor(points: Point[], base: Point): Point | undefined {
  let best: Point | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  const baseHue = hueOf(base.rgba);
  for (const point of points) {
    if (point.luminance >= base.luminance) {
      continue;
    }
    const distance = circularHueDistance(baseHue, point.hue);
    const better =
      best === undefined ||
      distance < bestDistance ||
      (distance === bestDistance &&
        (point.luminance < best.luminance ||
          (point.luminance === best.luminance && point.index < best.index)));
    if (better) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Lift flat colours into one family per colour, named `<prefix><palette index>`
 * so a recipe reads back to the list it came from. Only roles that a real
 * neighbour supplies are emitted; the rest stay absent and `E_NO_RAMP` names
 * `--derive-ramps` when a pass needs them.
 */
export function deriveRamps(colors: readonly string[], prefix = 'c'): Palette {
  if (colors.length === 0) {
    throw new PxError('E_BAD_PALETTE', 'Cannot derive ramps from an empty palette');
  }
  const points = pointsOf(colors);
  const sorted = [...points].sort(
    (left, right) => left.luminance - right.luminance || left.index - right.index,
  );
  const palette: Palette = {};
  points.forEach((point, position) => {
    // `prefix` is literal: callers pass `c` or a palette name plus `_`.
    const ramp: Partial<Record<RampRole, string>> = { base: point.hex };
    const shadow = nearestLower(point, sorted);
    const highlight = nearestHigher(point, sorted);
    const outline = outlineFor(points, point);
    if (outline !== undefined) {
      ramp.outline = outline.hex;
    }
    if (shadow !== undefined) {
      ramp.shadow = shadow.hex;
    }
    if (highlight !== undefined) {
      ramp.highlight = highlight.hex;
    }
    palette[`${prefix}${position}`] = { ramp };
  });
  return palette;
}
