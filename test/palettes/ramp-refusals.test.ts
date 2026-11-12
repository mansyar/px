/**
 * Ramp separability is an input limit, never an engine fault (F10, FR-15).
 *
 * A base at either end of the luminance range can run out of distinct 8-bit
 * tones. Synthesis may then refuse the ramp, but the refusal must be
 * `E_RAMP_UNSEPARABLE` — an answer the caller can act on by lightening the base
 * or asking for fewer steps — and never `E_INTERNAL`, which tells the caller to
 * report an engine defect. This sweeps the greys and a coarse slice of the RGB
 * cube at every legal step count.
 */

import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import { synthesizeRamp } from '../../src/palettes/synthesize.js';

function grey(value: number): string {
  return `#${value.toString(16).padStart(2, '0').repeat(3)}`;
}

function colour(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}

function sweep(): string[] {
  const bases: string[] = [];
  for (let value = 0; value <= 255; value += 5) {
    bases.push(grey(value));
  }
  for (let red = 0; red <= 255; red += 51) {
    for (let green = 0; green <= 255; green += 51) {
      for (let blue = 0; blue <= 255; blue += 51) {
        bases.push(colour(red, green, blue));
      }
    }
  }
  return bases;
}

describe('ramp separability', () => {
  it('refuses with E_RAMP_UNSEPARABLE, never with an engine fault', () => {
    const faults: string[] = [];
    for (const base of sweep()) {
      for (const steps of [3, 4, 5, 6]) {
        try {
          const tones = synthesizeRamp(base, steps);
          expect(tones).toHaveLength(steps);
        } catch (error) {
          expect(error).toBeInstanceOf(PxError);
          const fault = error as PxError;
          if (fault.code !== 'E_RAMP_UNSEPARABLE') {
            faults.push(`${base} at ${steps} steps raised ${fault.code}`);
          }
          expect(fault.hint).toContain(base);
        }
      }
    }
    expect(faults).toEqual([]);
  });
});
