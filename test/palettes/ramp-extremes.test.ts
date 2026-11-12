/**
 * The extreme ends of the sRGB cube: a ramp must never be written with two
 * indistinguishable steps. When 8-bit quantisation leaves no room, synthesis
 * refuses loudly instead of silently breaking AC-13.
 */

import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import { parseHex } from '../../src/core/palette.js';
import { relativeLuminance } from '../../src/palettes/luminance.js';
import { synthesizeRamp } from '../../src/palettes/synthesize.js';

const EXTREMES = [
  '#ffffff',
  '#fefefe',
  '#010101',
  '#0a0a0a',
  '#ffec27',
  '#00ff00',
  '#ff0000',
  '#0000ff',
];

function luminance(hex: string): number {
  return relativeLuminance(parseHex(hex) ?? { r: 0, g: 0, b: 0, a: 255 });
}

describe('extreme base ramps', () => {
  it('never returns two tones at the same luminance', () => {
    for (const base of EXTREMES) {
      for (const steps of [3, 4, 5, 6]) {
        let tones: string[];
        try {
          tones = synthesizeRamp(base, steps);
        } catch (error) {
          expect(error).toBeInstanceOf(PxError);
          expect((error as PxError).code).toBe('E_INTERNAL');
          continue;
        }
        for (let index = 1; index < tones.length; index += 1) {
          expect(
            luminance(tones[index] ?? '#000000'),
            `${base} at ${steps} steps produced ${tones.join(', ')}`,
          ).toBeLessThan(luminance(tones[index - 1] ?? '#000000'));
        }
      }
    }
  });
});
