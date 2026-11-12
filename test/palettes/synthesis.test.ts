import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import { parseHex, type Rgba } from '../../src/core/palette.js';
import { relativeLuminance } from '../../src/palettes/luminance.js';
import { rgbaToOklch } from '../../src/palettes/oklch.js';
import {
  MAX_RAMP_STEPS,
  MIN_RAMP_STEPS,
  RAMP_CHROMA_CLAMP,
  RAMP_COOL_HUE,
  RAMP_WARM_HUE,
  synthesizeRamp,
  toneOffset,
} from '../../src/palettes/synthesize.js';

const HEX = /^#[0-9a-f]{6}$/;

/** The base colours AC-13 and the edge cases are calibrated against. */
const BASES = [
  '#b13e53', // saturated mid red
  '#5d275d', // deep purple
  '#008751', // saturated green
  '#ffffff', // near-white extreme
  '#fefefe',
  '#010101', // near-black extreme
  '#0a0a0a',
  '#808080', // grey
  '#9d9d9d',
  '#ff0000', // highly saturated, clipped chroma
  '#00ff00',
  '#0000ff',
  '#ffec27',
];

function rgbaOf(hex: string): Rgba {
  return parseHex(hex) ?? { r: 0, g: 0, b: 0, a: 255 };
}

function luminance(hex: string): number {
  return relativeLuminance(rgbaOf(hex));
}

describe('ramp synthesis', () => {
  it('produces the requested number of authored hex tones', () => {
    for (const steps of [3, 4, 5, 6]) {
      const tones = synthesizeRamp('#b13e53', steps);
      expect(tones).toHaveLength(steps);
      for (const tone of tones) {
        expect(tone).toMatch(HEX);
      }
      expect(new Set(tones).size).toBe(steps);
    }
  });

  it('lists tones lightest first and strictly monotonic in WCAG luminance (AC-13)', () => {
    for (const base of BASES) {
      for (const steps of [3, 4, 5]) {
        const tones = synthesizeRamp(base, steps);
        for (let index = 1; index < tones.length; index += 1) {
          expect(
            luminance(tones[index] ?? '#000000'),
            `${base} at ${steps} steps: tone ${index} is not darker than tone ${index - 1} (${tones.join(', ')})`,
          ).toBeLessThan(luminance(tones[index - 1] ?? '#000000'));
        }
      }
    }
  });

  it('separates six tones or refuses the ramp loudly', () => {
    // The 0.08 floor leaves room for only two distinct 8-bit greys below it, so
    // a near-black base cannot always carry six tones. Refusing is the specified
    // behaviour; writing two identical tones would be the defect.
    for (const base of BASES) {
      let tones: string[];
      try {
        tones = synthesizeRamp(base, 6);
      } catch (error) {
        expect(error).toBeInstanceOf(PxError);
        expect((error as PxError).code).toBe('E_INTERNAL');
        continue;
      }
      expect(tones).toHaveLength(6);
      for (let index = 1; index < tones.length; index += 1) {
        expect(luminance(tones[index] ?? '#000000')).toBeLessThan(
          luminance(tones[index - 1] ?? '#000000'),
        );
      }
    }
  });

  it('spans ±0.06 per index around the base', () => {
    expect([0, 1, 2, 3, 4].map((position) => toneOffset(position, 5))).toEqual([2, 1, 0, -1, -2]);
    expect([0, 1, 2].map((position) => toneOffset(position, 3))).toEqual([1, 0, -1]);
    expect([0, 1, 2, 3].map((position) => toneOffset(position, 4))).toEqual([2, 1, 0, -1]);
  });

  it('rotates shadows cool and highlights warm, along the shorter arc', () => {
    const base = rgbaToOklch(rgbaOf('#b13e53'));
    const tones = synthesizeRamp('#b13e53', 5);
    const shadow = rgbaToOklch(rgbaOf(tones[4] ?? '#000000'));
    const highlight = rgbaToOklch(rgbaOf(tones[0] ?? '#000000'));

    const darkArc = Math.abs(shadow.h - RAMP_COOL_HUE) % 360;
    const baseDarkArc = Math.abs(base.h - RAMP_COOL_HUE) % 360;
    expect(Math.min(darkArc, 360 - darkArc)).toBeLessThan(Math.min(baseDarkArc, 360 - baseDarkArc));

    const lightArc = Math.abs(highlight.h - RAMP_WARM_HUE) % 360;
    const baseLightArc = Math.abs(base.h - RAMP_WARM_HUE) % 360;
    expect(Math.min(lightArc, 360 - lightArc)).toBeLessThan(
      Math.min(baseLightArc, 360 - baseLightArc),
    );
    expect(highlight.h).not.toBeCloseTo(shadow.h, 3);
  });

  it('shifts luminance only for a grey input', () => {
    for (const base of ['#808080', '#9d9d9d', '#404040']) {
      for (const tone of synthesizeRamp(base, 5)) {
        const rgba = rgbaOf(tone);
        expect(rgba.r, `${base} produced ${tone}`).toBe(rgba.g);
        expect(rgba.g, `${base} produced ${tone}`).toBe(rgba.b);
        expect(rgbaToOklch(rgba).c).toBeLessThan(0.004);
      }
    }
  });

  it('clamps chroma instead of chasing a saturated base', () => {
    for (const base of ['#ff0000', '#00ff00', '#0000ff']) {
      for (const tone of synthesizeRamp(base, 5)) {
        expect(rgbaToOklch(rgbaOf(tone)).c).toBeLessThanOrEqual(RAMP_CHROMA_CLAMP + 0.002);
      }
    }
  });

  it('is deterministic', () => {
    expect(synthesizeRamp('#b13e53', 5)).toEqual(synthesizeRamp('#b13e53', 5));
  });

  it('keeps the two extremes distinguishable', () => {
    expect(synthesizeRamp('#000000', 3)[0]).not.toBe('#000000');
    expect(synthesizeRamp('#ffffff', 3).at(-1)).not.toBe('#ffffff');
  });

  it('rejects a base that is not hex', () => {
    expect(() => synthesizeRamp('red', 5)).toThrow(/not a hex colour/);
  });

  it('names the legal step range', () => {
    expect(MIN_RAMP_STEPS).toBe(3);
    expect(MAX_RAMP_STEPS).toBe(6);
  });
});
