/**
 * AC-3, AC-4: `skip` keeps an authored tone while its neighbours are shaded, and
 * an allow-list plus a deny-list is an error rather than a silent precedence
 * rule. Selection is a colour decision only — ownership never moves.
 */

import { describe, expect, it } from 'vitest';
import { type CompiledRecipe, compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Palette } from '../../src/core/recipe/types.js';

const RAMP: Palette = {
  ink: { ramp: { outline: '#000000', shadow: '#404040', base: '#808080', highlight: '#c0c0c0' } },
};

function compileWith(light: Record<string, unknown>): CompiledRecipe {
  const recipe = {
    version: '1.1',
    meta: { name: 'parts', width: 32, height: 8, alpha_mode: 'binary' },
    palette: RAMP,
    anchors: {},
    layers: [
      {
        id: 'base',
        ops: [
          { op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'ink.base', part: 'painted' },
          { op: 'rect', x: 16, y: 0, w: 8, h: 8, color: 'ink.base', part: 'kept' },
          { op: 'light', angle: 'top-left', form: 'round', ao: false, rim: 'none', ...light },
        ],
      },
    ],
    parts: { painted: { material: 'ink' }, kept: { material: 'ink' } },
  };
  return compileRecipe(parseRecipe(JSON.stringify(recipe)).recipe);
}

function regionSlots(run: CompiledRecipe, fromX: number, toX: number): Set<number> {
  const out = new Set<number>();
  for (let y = 0; y < run.height; y += 1) {
    for (let x = fromX; x < toX; x += 1) {
      const slot = run.flattened[y * run.width + x] as number;
      if (slot >= 0) out.add(slot);
    }
  }
  return out;
}

describe('light part selection', () => {
  it('leaves a skipped part on its authored tone', () => {
    const run = compileWith({ skip: ['kept'] });
    expect(regionSlots(run, 16, 24).size).toBe(1);
    expect(regionSlots(run, 0, 8).size).toBeGreaterThan(1);
  });

  it('shades only the allow-listed part', () => {
    const run = compileWith({ parts: ['painted'] });
    expect(regionSlots(run, 0, 8).size).toBeGreaterThan(1);
    expect(regionSlots(run, 16, 24).size).toBe(1);
  });

  it('refuses parts and skip together', () => {
    expect(() => compileWith({ parts: ['painted'], skip: ['kept'] })).toThrow(/both/);
  });

  it('refuses a part the recipe does not declare', () => {
    expect(() => compileWith({ skip: ['ghost'] })).toThrow(/ghost/);
  });
});
