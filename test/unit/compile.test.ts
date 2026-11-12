import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Recipe } from '../../src/core/recipe/types.js';
import { rasterizeSlots } from '../../src/render/flatten.js';

function recipeWithColors(colors: string[]): string {
  return JSON.stringify({
    version: 1,
    meta: { name: 'swap', width: 8, height: 8, alpha_mode: 'binary' },
    palette: { main: { colors } },
    anchors: {},
    layers: [
      {
        id: 'base',
        ops: [
          [
            'set_pixels',
            [
              [1, 1],
              [2, 2],
            ],
            'main.0',
          ],
          ['rect', 4, 4, 2, 2, 'main.1'],
        ],
      },
    ],
  });
}

describe('compile', () => {
  it('keeps slot identity while a palette swap changes every colour', () => {
    const before = parseRecipe(recipeWithColors(['#000000', '#ffffff']));
    const after = parseRecipe(recipeWithColors(['#ff0000', '#00ff00']));

    expect(after.slots.names).toEqual(before.slots.names);

    const beforeCompiled = compileRecipe(before.recipe);
    const afterCompiled = compileRecipe(after.recipe);
    expect(afterCompiled.flattened).toEqual(beforeCompiled.flattened);

    const beforeRgba = rasterizeSlots(
      beforeCompiled.flattened,
      beforeCompiled.width,
      beforeCompiled.height,
      beforeCompiled.slots,
    );
    const afterRgba = rasterizeSlots(
      afterCompiled.flattened,
      afterCompiled.width,
      afterCompiled.height,
      afterCompiled.slots,
    );
    const beforePixel = Array.from(beforeRgba.slice(36, 40));
    const afterPixel = Array.from(afterRgba.slice(36, 40));
    expect(Array.from(afterRgba)).not.toEqual(Array.from(beforeRgba));
    expect(beforePixel).toEqual([0, 0, 0, 255]);
    expect(afterPixel).toEqual([255, 0, 0, 255]);
  });

  it('keeps layers separate and flattens later layers on top', () => {
    const text = JSON.stringify({
      version: 1,
      meta: { name: 'layers', width: 8, height: 8, alpha_mode: 'binary' },
      palette: { main: { colors: ['#000000', '#ffffff'] } },
      anchors: {},
      layers: [
        { id: 'under', ops: [['rect', 0, 0, 4, 4, 'main.0']] },
        { id: 'over', ops: [['set_pixels', [[0, 0]], 'main.1']] },
      ],
    });
    const compiled = compileRecipe(parseRecipe(text).recipe);
    expect(compiled.layers.map((layer) => layer.id)).toEqual(['under', 'over']);
    expect(compiled.layers[0]?.canvas.get(0, 0)).toBe(0);
    expect(compiled.flattened[0]).toBe(1);
    expect(compiled.flattened[1]).toBe(0);
  });

  it('reports one warning per clipped op and still renders the visible part', () => {
    const text = JSON.stringify({
      version: 1,
      meta: { name: 'clip', width: 8, height: 8, alpha_mode: 'binary' },
      palette: { main: { colors: ['#000000'] } },
      anchors: {},
      layers: [{ id: 'base', ops: [['rect', -2, -2, 4, 4, 'main.0']] }],
    });
    const compiled = compileRecipe(parseRecipe(text).recipe);
    const warnings = compiled.warnings.filter((warning) => warning.code === 'W_OUT_OF_BOUNDS');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.layer).toBe('base');
    expect(warnings[0]?.op_index).toBe(0);
    expect(compiled.layers[0]?.canvas.paintedCount()).toBe(4);
  });

  it('rejects a slot that a programmatic recipe never declared', () => {
    const recipe: Recipe = {
      version: 1,
      meta: { name: 'raw', width: 8, height: 8, alphaMode: 'binary' },
      palette: { main: { colors: ['#000000'] } },
      anchors: {},
      layers: [{ id: 'base', ops: [{ op: 'set_pixels', points: [[0, 0]], color: 'main.9' }] }],
    };
    try {
      compileRecipe(recipe);
      expect.unreachable('unknown slot compiled');
    } catch (error) {
      expect(error).toBeInstanceOf(PxError);
      const pxError = error as PxError;
      expect(pxError.code).toBe('E_UNKNOWN_SLOT');
      expect(pxError.location).toEqual({ layer: 'base', op_index: 0 });
    }
  });
});
