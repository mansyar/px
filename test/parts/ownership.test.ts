/**
 * Derived part masks: last writer owns the pixel, replay is deterministic, and
 * declared-but-unpainted parts fail (FR-3, FR-4; AC-3, AC-4).
 */

import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { codeOf, parseText, recipeText } from './helpers.js';

/** Owners as a flat list of `[x, y, part name or null]` for readable assertions. */
function ownerMap(recipeTextValue: string): Array<[number, number, string | null]> {
  const compiled = compileRecipe(parseText(recipeTextValue));
  const layers = compiled.layers.map((layer) => layer.canvas);
  const width = compiled.width;
  const height = compiled.height;
  const names = compiled.parts.map((part) => part.name);
  const flat = new Int16Array(width * height).fill(-1);
  for (const layer of layers) {
    for (let index = 0; index < layer.slots.length; index += 1) {
      if (layer.slots[index] !== -1) {
        flat[index] = layer.owners[index] ?? -1;
      }
    }
  }
  const out: Array<[number, number, string | null]> = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const owner = flat[y * width + x] ?? -1;
      if (owner >= 0) {
        out.push([x, y, names[owner] ?? null]);
      }
    }
  }
  return out;
}

const TWO_PARTS = {
  parts: {
    blade: { material: 'steel' },
    hilt: { material: 'leather' },
  },
};

describe('derived masks', () => {
  it('assigns pixels to the part that painted them', () => {
    const owners = ownerMap(
      recipeText({
        ...TWO_PARTS,
        layers: [
          {
            id: 'base',
            ops: [
              { op: 'rect', x: 0, y: 0, w: 2, h: 1, color: 'steel.base', part: 'blade' },
              { op: 'rect', x: 4, y: 0, w: 2, h: 1, color: 'leather.t0', part: 'hilt' },
            ],
          },
        ],
      }),
    );
    expect(owners).toEqual([
      [0, 0, 'blade'],
      [1, 0, 'blade'],
      [4, 0, 'hilt'],
      [5, 0, 'hilt'],
    ]);
  });

  it('leaves an untagged op unassigned and takes ownership back', () => {
    const owners = ownerMap(
      recipeText({
        parts: { blade: { material: 'steel' } },
        layers: [
          {
            id: 'base',
            ops: [
              { op: 'rect', x: 0, y: 0, w: 3, h: 1, color: 'steel.base', part: 'blade' },
              { op: 'set_pixels', points: [[1, 0]], color: 'steel.shadow' },
            ],
          },
        ],
      }),
    );
    expect(owners).toEqual([
      [0, 0, 'blade'],
      [2, 0, 'blade'],
    ]);
  });

  it('lets the last writer win, with one info warning naming the displaced part (AC-4)', () => {
    const compiled = compileRecipe(
      parseText(
        recipeText({
          ...TWO_PARTS,
          layers: [
            {
              id: 'base',
              ops: [
                { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'steel.base', part: 'blade' },
                { op: 'rect', x: 1, y: 0, w: 2, h: 1, color: 'leather.t0', part: 'hilt' },
              ],
            },
          ],
        }),
      ),
    );
    const warnings = compiled.warnings.filter((warning) => warning.code === 'W_PART_OVERWRITE');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('blade');
    expect(warnings[0]?.message).toContain('hilt');
    expect(warnings[0]?.layer).toBe('base');
    expect(warnings[0]?.op_index).toBe(1);

    const blade = compiled.parts.find((part) => part.name === 'blade');
    const hilt = compiled.parts.find((part) => part.name === 'hilt');
    expect(blade?.painted).toBe(3);
    expect(hilt?.painted).toBe(2);
  });

  it('clears ownership on an erase', () => {
    const owners = ownerMap(
      recipeText({
        ...TWO_PARTS,
        layers: [
          {
            id: 'base',
            ops: [
              { op: 'rect', x: 0, y: 0, w: 2, h: 1, color: 'steel.base', part: 'blade' },
              { op: 'rect', x: 4, y: 0, w: 1, h: 1, color: 'leather.t0', part: 'hilt' },
              { op: 'set_pixels', points: [[0, 0]], color: null, part: 'blade' },
            ],
          },
        ],
      }),
    );
    expect(owners).toEqual([
      [1, 0, 'blade'],
      [4, 0, 'hilt'],
    ]);
  });

  it('replays to identical masks and identical rasters (AC-3)', () => {
    const text = recipeText({
      ...TWO_PARTS,
      layers: [
        {
          id: 'base',
          ops: [
            { op: 'rect', x: 1, y: 1, w: 4, h: 3, color: 'steel.base', part: 'blade' },
            { op: 'line', x1: 0, y1: 7, x2: 7, y2: 7, color: 'leather.t0', part: 'hilt' },
            { op: 'mirror', axis: 'x', pivot: 3.5 },
          ],
        },
      ],
    });
    const first = compileRecipe(parseText(text));
    const second = compileRecipe(parseText(text));
    expect(Array.from(first.flattened)).toEqual(Array.from(second.flattened));
    for (let index = 0; index < first.layers.length; index += 1) {
      const left = first.layers[index]?.canvas;
      const right = second.layers[index]?.canvas;
      expect(left === undefined || right === undefined).toBe(false);
      expect(Array.from(left?.owners ?? [])).toEqual(Array.from(right?.owners ?? []));
    }
    expect(first.parts).toEqual(second.parts);
  });

  it('carries ownership through mirror', () => {
    const owners = ownerMap(
      recipeText({
        ...TWO_PARTS,
        layers: [
          {
            id: 'base',
            ops: [
              { op: 'set_pixels', points: [[0, 0]], color: 'steel.base', part: 'blade' },
              { op: 'set_pixels', points: [[1, 1]], color: 'leather.t0', part: 'hilt' },
              { op: 'mirror', axis: 'x', pivot: 3.5 },
            ],
          },
        ],
      }),
    );
    expect(owners).toEqual([
      [0, 0, 'blade'],
      [7, 0, 'blade'],
      [1, 1, 'hilt'],
      [6, 1, 'hilt'],
    ]);
  });

  it('gives an outer outline the part it borders', () => {
    const compiled = compileRecipe(
      parseText(
        recipeText({
          parts: { blade: { material: 'steel' } },
          layers: [
            {
              id: 'base',
              ops: [{ op: 'rect', x: 2, y: 2, w: 2, h: 2, color: 'steel.base', part: 'blade' }],
            },
            {
              id: 'edge',
              ops: [
                {
                  op: 'auto_outline',
                  color: 'steel.outline',
                  where: 'outer',
                  target_layer: 'base',
                },
              ],
            },
          ],
        }),
      ),
    );
    const blade = compiled.parts.find((part) => part.name === 'blade');
    // The 2x2 block plus the 8 orthogonal cells around it.
    expect(blade?.painted).toBe(12);
    expect(blade?.bounds).toEqual({ x: 1, y: 1, w: 4, h: 4 });
  });

  it('reports per-part pixel counts and bounds', () => {
    const compiled = compileRecipe(
      parseText(
        recipeText({
          ...TWO_PARTS,
          layers: [
            {
              id: 'base',
              ops: [
                { op: 'rect', x: 0, y: 0, w: 2, h: 3, color: 'steel.base', part: 'blade' },
                { op: 'rect', x: 5, y: 5, w: 2, h: 1, color: 'leather.t0', part: 'hilt' },
              ],
            },
          ],
        }),
      ),
    );
    expect(compiled.parts).toEqual([
      {
        name: 'blade',
        material: 'steel',
        gloss: 'matte',
        z: 0,
        painted: 6,
        bounds: { x: 0, y: 0, w: 2, h: 3 },
      },
      {
        name: 'hilt',
        material: 'leather',
        gloss: 'matte',
        z: 0,
        painted: 2,
        bounds: { x: 5, y: 5, w: 2, h: 1 },
      },
    ]);
  });
});

describe('empty parts', () => {
  it('fails a declared part that owns no pixels (AC-4)', () => {
    const error = codeOf(() =>
      compileRecipe(
        parseText(
          recipeText({
            ...TWO_PARTS,
            layers: [
              {
                id: 'base',
                ops: [{ op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'steel.base', part: 'blade' }],
              },
            ],
          }),
        ),
      ),
    );
    expect(error.code).toBe('E_EMPTY_PART');
    expect(error.message).toContain('hilt');
    expect(error.hint).toContain('"hilt"');
  });

  it('does not check anything when no parts are declared', () => {
    expect(() => compileRecipe(parseText(recipeText({ parts: undefined })))).not.toThrow();
  });
});
