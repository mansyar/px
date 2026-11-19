import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { compileRecipe, compileRecipeFrames } from '../../src/core/compile.js';
import { PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Recipe } from '../../src/core/recipe/types.js';
import { rasterizeSlots } from '../../src/render/flatten.js';
import { encodePng } from '../../src/render/png.js';

function renderSha(compiled: ReturnType<typeof compileRecipe>): string {
  const rgba = rasterizeSlots(compiled.flattened, compiled.width, compiled.height, compiled.slots);
  return createHash('sha256')
    .update(encodePng(compiled.width, compiled.height, rgba))
    .digest('hex');
}

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

  it('compiles frame 0 identically to the legacy single frame and hashes extra frames deterministically', () => {
    const legacyText = recipeWithColors(['#000000', '#ffffff']);
    const legacy = compileRecipe(parseRecipe(legacyText).recipe);

    const framed = JSON.parse(legacyText) as Record<string, unknown>;
    framed.version = '1.4';
    framed.frames = [
      { id: 'idle', layers: [{ id: 'base', ops: [['rect', 0, 0, 2, 2, 'main.1']] }] },
      {
        id: 'walk',
        layers: [{ id: 'base', ops: [['rect', 4, 4, 2, 2, 'main.1']] }],
        duration: 100,
      },
    ];
    const framedText = JSON.stringify(framed);
    const frames = compileRecipeFrames(parseRecipe(framedText).recipe);

    expect(frames.map((frame) => frame.index)).toEqual([0, 1, 2]);
    expect(frames.map((frame) => frame.id)).toEqual([undefined, 'idle', 'walk']);
    const first = frames[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    expect(first.compiled.flattened).toEqual(legacy.flattened);
    expect(first.compiled.layers.map((layer) => layer.id)).toEqual(
      legacy.layers.map((layer) => layer.id),
    );
    expect(first.compiled.owners).toEqual(legacy.owners);
    expect(first.compiled.slots.names).toEqual(legacy.slots.names);
    expect(renderSha(first.compiled)).toBe(renderSha(legacy));

    const hashes = frames.slice(1).map((frame) => renderSha(frame.compiled));
    expect(new Set(hashes).size).toBe(2);
    expect(hashes[0]).not.toBe(renderSha(legacy));
    const again = compileRecipeFrames(parseRecipe(framedText).recipe);
    expect(again.slice(1).map((frame) => renderSha(frame.compiled))).toEqual(hashes);
  });

  it('shares the base canvas, palette and clipping rule with every frame', () => {
    const text = JSON.stringify({
      version: '1.4',
      meta: { name: 'shared', width: 8, height: 8, alpha_mode: 'binary' },
      palette: { main: { colors: ['#000000'] } },
      anchors: {},
      layers: [{ id: 'base', ops: [['rect', 0, 0, 2, 2, 'main.0']] }],
      frames: [{ id: 'clip', layers: [{ id: 'base', ops: [['rect', -2, -2, 4, 4, 'main.0']] }] }],
    });
    const frames = compileRecipeFrames(parseRecipe(text).recipe);
    const extra = frames[1];
    expect(extra).toBeDefined();
    if (extra === undefined) return;
    expect(extra.compiled.width).toBe(8);
    expect(extra.compiled.height).toBe(8);
    expect(extra.compiled.slots.names).toEqual(frames[0]?.compiled.slots.names);
    const clipped = extra.compiled.warnings.filter((warning) => warning.code === 'W_OUT_OF_BOUNDS');
    expect(clipped).toHaveLength(1);
    expect(clipped[0]?.layer).toBe('base');
    expect(extra.compiled.layers[0]?.canvas.paintedCount()).toBe(4);
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
