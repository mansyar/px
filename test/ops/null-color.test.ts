import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import { base, compileOps, countPainted, INK_ALT, paint, recipeOf } from './helpers.js';

function codeOf(run: () => void): string {
  try {
    run();
    return 'NO_THROW';
  } catch (error) {
    return error instanceof PxError ? error.code : 'NOT_PX';
  }
}

const BACKGROUND = { op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'ink.0' };

describe('null colour', () => {
  it('erases for rect', () => {
    const { compiled } = compileOps(
      [BACKGROUND, { op: 'rect', x: 2, y: 2, w: 2, h: 2, color: null }],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    const rows = paint(base(compiled));
    expect(rows[2]).toBe('##..####');
    expect(countPainted(base(compiled))).toBe(60);
  });

  it('erases for set_pixels and line', () => {
    const pixels = compileOps([BACKGROUND, { op: 'set_pixels', points: [[1, 1]], color: null }], {
      palette: INK_ALT,
      width: 8,
      height: 8,
    });
    expect(base(pixels.compiled).get(1, 1)).toBe(-1);

    const line = compileOps([BACKGROUND, { op: 'line', x1: 0, y1: 0, x2: 7, y2: 0, color: null }], {
      palette: INK_ALT,
      width: 8,
      height: 8,
    });
    expect(paint(base(line.compiled))[0]).toBe('........');
  });

  it('erases for ellipse and polygon', () => {
    const ellipse = compileOps(
      [BACKGROUND, { op: 'ellipse', x: 1, y: 1, w: 5, h: 5, color: null, fill: true }],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    expect(base(ellipse.compiled).get(3, 3)).toBe(-1);
    expect(base(ellipse.compiled).get(0, 0)).toBe(ellipse.compiled.slots.resolve('ink.0'));

    const polygon = compileOps(
      [
        BACKGROUND,
        {
          op: 'polygon',
          points: [
            [2, 2],
            [6, 2],
            [6, 6],
            [2, 6],
          ],
          color: null,
        },
      ],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    expect(base(polygon.compiled).get(4, 4)).toBe(-1);
    expect(paint(base(polygon.compiled))[0]).toBe('########');
  });

  it('erases for flood_fill, stopping at the region boundary', () => {
    const { compiled } = compileOps(
      [
        { op: 'rect', x: 0, y: 0, w: 4, h: 4, color: 'ink.0' },
        { op: 'rect', x: 5, y: 5, w: 2, h: 2, color: 'ink.0' },
        { op: 'flood_fill', x: 1, y: 1, color: null },
      ],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    const canvas = base(compiled);
    expect(canvas.get(0, 0)).toBe(-1);
    expect(canvas.get(5, 5)).toBe(compiled.slots.resolve('ink.0'));
    expect(countPainted(canvas)).toBe(4);
  });

  it('erases for dither_fill', () => {
    const { compiled } = compileOps(
      [
        BACKGROUND,
        { op: 'dither_fill', x: 0, y: 0, w: 8, h: 8, color: null, pattern: 'checker_50' },
      ],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    expect(paint(base(compiled))[0]).toBe('.#.#.#.#');
    expect(countPainted(base(compiled))).toBe(32);
  });

  it('is a no-op on an already transparent pixel', () => {
    const { compiled } = compileOps([{ op: 'rect', x: 0, y: 0, w: 2, h: 2, color: null }], {
      palette: INK_ALT,
      width: 8,
      height: 8,
    });
    expect(countPainted(base(compiled))).toBe(0);
    expect(compiled.warnings).toEqual([]);
  });

  it('distinguishes an omitted colour from an explicit null', () => {
    const omitted = [
      { op: 'set_pixels', points: [[0, 0]] },
      { op: 'rect', x: 0, y: 0, w: 1, h: 1 },
      { op: 'line', x1: 0, y1: 0, x2: 1, y2: 1 },
      { op: 'ellipse', x: 0, y: 0, w: 2, h: 2 },
      {
        op: 'polygon',
        points: [
          [0, 0],
          [1, 0],
          [0, 1],
        ],
      },
      { op: 'flood_fill', x: 0, y: 0 },
      { op: 'dither_fill', x: 0, y: 0, w: 2, h: 2, pattern: 'checker_50' },
    ];
    for (const op of omitted) {
      expect(codeOf(() => compileOps([op]))).toBe('E_MISSING_COLOR');
    }
    expect(codeOf(() => compileOps([{ op: 'rect', x: 0, y: 0, w: 1, h: 1, color: null }]))).toBe(
      'NO_THROW',
    );
  });

  it('round-trips an explicit null through the canonical writer', () => {
    const recipe = recipeOf([{ op: 'rect', x: 0, y: 0, w: 1, h: 1, color: null }], {
      palette: INK_ALT,
    });
    const text = serializeRecipe(recipe);
    expect(text).toContain('"color": null');
    const parsed = parseRecipe(text).recipe;
    const op = parsed.layers[0]?.ops[0];
    expect(op?.op).toBe('rect');
    expect(op && 'color' in op ? op.color : 'missing').toBeNull();
  });
});
