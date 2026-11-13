/**
 * AC-13 (ramp half): derivation steps evenly and shifts hue across the stops.
 *
 * A ramp that only changes value reads as one colour at four brightnesses; the
 * hue shift is what makes the palette carry form. Explicit ramps keep their
 * bytes, so derivation is additive rather than a replacement.
 */

import { describe, expect, it } from 'vitest';
import { buildSlotTable, deriveRamp, parseHex, type Rgba } from '../../src/core/palette.js';
import type { Palette } from '../../src/core/recipe/types.js';

function hsl(rgba: Rgba): { h: number; s: number; l: number } {
  const r = rgba.r / 255;
  const g = rgba.g / 255;
  const b = rgba.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function stopsOf(base: string, count: number) {
  return Object.values(deriveRamp(base, count))
    .filter((hex): hex is string => hex !== undefined)
    .map((hex) => hsl(parseHex(hex) as Rgba));
}

describe('ramp derivation', () => {
  it('produces the requested number of tones, lightest first', () => {
    expect(Object.keys(deriveRamp('#8a5a2b', 5))).toEqual(['t0', 't1', 't2', 't3', 't4']);
  });

  it('steps lightness evenly', () => {
    const stops = stopsOf('#8a5a2b', 5);
    const deltas = stops.slice(1).map((stop, index) => stop.l - (stops[index] as { l: number }).l);
    const first = deltas[0] as number;
    for (const delta of deltas) {
      expect(Math.abs(delta - first)).toBeLessThan(1e-9);
    }
    expect(first).toBeLessThan(0);
  });

  it('shifts hue from warm highlights to cool shadows', () => {
    const stops = stopsOf('#8a5a2b', 5);
    const highlight = stops[0] as { h: number };
    const shadow = stops[stops.length - 1] as { h: number };
    expect(Math.abs(shadow.h - highlight.h)).toBeGreaterThan(5);
  });

  it('registers a derived family as a ramp with derived roles', () => {
    const palette = { wood: { derive: { base: '#8a5a2b', stops: 5 } } } as unknown as Palette;
    const slots = buildSlotTable(palette);
    const wood = slots.families.find((family) => family.name === 'wood');
    expect(wood?.slots).toEqual(['wood.t0', 'wood.t1', 'wood.t2', 'wood.t3', 'wood.t4']);
    expect(wood?.kind).toBe('ramp');
  });

  it('leaves an explicit ramp untouched', () => {
    const palette: Palette = { ink: { ramp: { base: '#808080', shadow: '#404040' } } };
    expect(buildSlotTable(palette).families[0]?.slots).toEqual(['ink.shadow', 'ink.base']);
  });
});
