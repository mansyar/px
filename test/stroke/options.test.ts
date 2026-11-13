import { describe, expect, it } from 'vitest';
import { UNOWNED } from '../../src/core/canvas.js';
import { type CompiledRecipe, compileRecipe } from '../../src/core/compile.js';
import { PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import type { Recipe } from '../../src/core/recipe/types.js';
import {
  base,
  compileOps,
  countPainted,
  INK_ALT,
  paint,
  recipeOf,
  SHADED,
} from '../ops/helpers.js';

/** A 1.1 recipe with one declared part, for the ownership assertions. */
function compileParts(ops: unknown[]): { compiled: CompiledRecipe } {
  const recipe: Recipe = parseRecipe(
    JSON.stringify({
      version: '1.1',
      meta: { name: 'stroke', width: 8, height: 8, alpha_mode: 'binary' },
      palette: SHADED,
      parts: { blade: { material: 'cloth', gloss: 'matte', z: 0 } },
      anchors: {},
      layers: [{ id: 'base', ops }],
    }),
  ).recipe;
  return { compiled: compileRecipe(recipe) };
}

function codeOf(run: () => void): string {
  try {
    run();
    return 'NO_THROW';
  } catch (error) {
    return error instanceof PxError ? error.code : 'NOT_PX';
  }
}

describe('stroke — width (FR-7)', () => {
  it('draws two pixels per centreline pixel at width 2', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [0, 0],
            [20, 0],
          ],
          color: 'ink.0',
          width: 2,
        },
      ],
      { width: 24, height: 8 },
    );
    const rows = paint(base(compiled));
    expect(countPainted(base(compiled))).toBe(42);
    expect(rows[0]?.slice(0, 21)).toBe('#'.repeat(21));
    expect(rows[1]?.slice(0, 21)).toBe('#'.repeat(21));
    expect(rows[2]?.slice(0, 21)).toBe('.'.repeat(21));
  });

  it('clips the overhang and warns once', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [0, 7],
            [7, 7],
          ],
          color: 'ink.0',
          width: 2,
        },
      ],
      { width: 8, height: 8 },
    );
    expect(countPainted(base(compiled))).toBe(8);
    expect(compiled.warnings).toHaveLength(1);
    expect(compiled.warnings[0]).toMatchObject({
      code: 'W_OUT_OF_BOUNDS',
      op_index: 0,
      coord: [0, 8],
    });
  });

  it('rejects a width other than 1 or 2', () => {
    expect(
      codeOf(() =>
        compileOps([
          {
            op: 'stroke',
            path: [
              [0, 0],
              [4, 0],
            ],
            color: 'ink.0',
            width: 3,
          },
        ]),
      ),
    ).toBe('E_BAD_PARAM');
    expect(
      codeOf(() =>
        compileOps([
          {
            op: 'stroke',
            path: [
              [0, 0],
              [4, 0],
            ],
            color: 'ink.0',
            width: 1.5,
          },
        ]),
      ),
    ).toBe('E_BAD_PARAM');
  });
});

describe('stroke — erase (FR-8, AC-8)', () => {
  it('clears the colour and the ownership along the path', () => {
    const { compiled } = compileParts([
      { op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'cloth.base', part: 'blade' },
      {
        op: 'stroke',
        path: [
          [2, 2],
          [5, 2],
        ],
        color: null,
      },
    ]);
    const canvas = base(compiled);
    expect(canvas.get(2, 2)).toBe(-1);
    expect(canvas.get(5, 2)).toBe(-1);
    expect(compiled.owners[2 * 8 + 2]).toBe(UNOWNED);
    // One row below the erased path is still owned by the declared part.
    expect(compiled.owners[3 * 8 + 2]).toBe(0);
  });

  it('keeps ownership of erased pixels clear rather than re-attributing them', () => {
    const { compiled } = compileParts([
      { op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'cloth.base', part: 'blade' },
      {
        op: 'stroke',
        path: [
          [0, 4],
          [7, 4],
        ],
        color: null,
        part: 'blade',
      },
    ]);
    for (let x = 0; x < 8; x += 1) {
      expect(compiled.owners[4 * 8 + x]).toBe(UNOWNED);
    }
  });

  it('paints with an ordinary palette slot and a part', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [1, 1],
            [6, 1],
          ],
          color: 'ink.0',
        },
      ],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    expect(paint(base(compiled))[1]).toBe('.######.');
  });
});

describe('stroke — canonical form (FR-15)', () => {
  it('round-trips path, closure, smoothing and width unchanged', () => {
    const recipe = recipeOf(
      [
        {
          op: 'stroke',
          path: [
            [0, 0],
            [4, 1],
            [8, 0],
          ],
          color: 'ink.0',
          closed: true,
          smooth: true,
          width: 2,
        },
      ],
      { palette: INK_ALT },
    );
    const text = serializeRecipe(recipe);
    expect(text).toContain('"path"');
    expect(text).toContain('"closed": true');
    expect(text).toContain('"smooth": true');
    expect(text).toContain('"width": 2');
    const reparsed = parseRecipe(text).recipe;
    expect(serializeRecipe(reparsed)).toBe(text);
    expect(reparsed.layers[0]?.ops[0]).toMatchObject({
      op: 'stroke',
      closed: true,
      smooth: true,
      width: 2,
    });
  });

  it('omits the defaults so a plain stroke is written compactly', () => {
    const text = serializeRecipe(
      recipeOf(
        [
          {
            op: 'stroke',
            path: [
              [0, 0],
              [3, 3],
            ],
            color: 'ink.0',
          },
        ],
        { palette: INK_ALT },
      ),
    );
    const op = parseRecipe(text).recipe.layers[0]?.ops[0];
    expect(op).toBeDefined();
    expect(op !== undefined && 'closed' in op).toBe(false);
    expect(op !== undefined && 'smooth' in op).toBe(false);
    expect(op !== undefined && 'width' in op).toBe(false);
  });
});
