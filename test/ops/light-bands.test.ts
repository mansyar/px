/**
 * AC-1, AC-2: `bands` changes how many interior bands a mass carries, and the
 * absent option keeps the historical three-band output byte for byte.
 *
 * A band is a ramp role, and the ramp has three roles, so 4 bands currently
 * shares `base` across the two middle bands. That limitation is pinned here
 * rather than hidden: Phase 4's tone-valued roles are what make a fourth tone
 * reachable.
 */

import { describe, expect, it } from 'vitest';
import { type CompiledRecipe, compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Palette } from '../../src/core/recipe/types.js';

const RAMP: Palette = {
  ink: { ramp: { outline: '#000000', shadow: '#404040', base: '#808080', highlight: '#c0c0c0' } },
};

function compileWith(
  width: number,
  height: number,
  light: Record<string, unknown>,
): CompiledRecipe {
  const recipe = {
    version: '1.1',
    meta: { name: 'bands', width, height, alpha_mode: 'binary' },
    palette: RAMP,
    anchors: {},
    layers: [
      {
        id: 'base',
        ops: [
          { op: 'rect', x: 0, y: 0, w: width, h: height, color: 'ink.base', part: 'body' },
          { op: 'light', angle: 'top-left', form: 'round', ao: false, rim: 'none', ...light },
        ],
      },
    ],
    parts: { body: { material: 'ink' } },
  };
  return compileRecipe(parseRecipe(JSON.stringify(recipe)).recipe);
}

function distinct(run: CompiledRecipe): Set<number> {
  return new Set(Array.from(run.flattened).filter((slot) => slot >= 0));
}

describe('light bands', () => {
  it('places three distinct bands on a wide mass', () => {
    expect(distinct(compileWith(40, 8, { bands: 3 })).size).toBe(3);
  });

  it('is byte-identical when bands is absent', () => {
    const implicit = compileWith(40, 8, {});
    const explicit = compileWith(40, 8, { bands: 3 });
    expect(Array.from(explicit.flattened)).toEqual(Array.from(implicit.flattened));
  });

  it('degrades on a mass thinner than the count instead of erroring', () => {
    const thin = compileWith(40, 8, { bands: 4 });
    expect(distinct(thin).size).toBeGreaterThanOrEqual(2);
    expect(distinct(thin).size).toBeLessThanOrEqual(3);
  });

  it('shares the middle role when four bands meet a three-role ramp', () => {
    expect(distinct(compileWith(40, 8, { bands: 4 })).size).toBe(3);
  });

  it('measures uniform bands in pixels, not shares of the extent', () => {
    const thickness = compileWith(10, 8, { bands: 3 });
    const uniform = compileWith(10, 8, { bands: 3, band_scale: 'uniform' });
    expect(Array.from(uniform.flattened)).not.toEqual(Array.from(thickness.flattened));
  });

  it('refuses band_scale without bands', () => {
    expect(() => compileWith(10, 8, { band_scale: 'uniform' })).toThrow(/band_scale/);
  });
});
