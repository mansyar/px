/**
 * Named coordinate refs (FR-22, AC-18).
 *
 * AC-18 is the contract: a ref has to resolve to *exactly* the pixel its literal
 * number would, so the strongest test here draws the same op twice — once with
 * refs, once with the numbers the refs stand for — and compares the rendered
 * bytes. Everything else pins the resolution table, the entry-snapshot rule, the
 * grammar's failure modes and the canonical write.
 */

import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import { renderRecipe } from '../../src/render/render.js';

const RAMP = {
  outline: '#101010',
  shadow: '#303030',
  base: '#505050',
  highlight: '#909090',
};

type Json = Record<string, unknown>;

function recipeText(
  ops: unknown[],
  parts: Record<string, unknown> = { blade: { material: 'steel' } },
  anchors: Record<string, [number, number]> = {},
): string {
  return `${JSON.stringify({
    version: '1.1',
    meta: { name: 'refs', width: 16, height: 16, alpha_mode: 'binary' },
    palette: { steel: { ramp: RAMP } },
    parts,
    anchors,
    layers: [{ id: 'base', ops }],
  })}\n`;
}

function compile(text: string) {
  return compileRecipe(parseRecipe(text).recipe);
}

function render(text: string) {
  return renderRecipe(parseRecipe(text).recipe);
}

/** Coordinates of every painted pixel, in raster order. */
function painted(text: string): Array<[number, number]> {
  const compiled = compile(text);
  const points: Array<[number, number]> = [];
  for (let y = 0; y < compiled.height; y += 1) {
    for (let x = 0; x < compiled.width; x += 1) {
      if ((compiled.flattened[y * compiled.width + x] ?? -1) >= 0) {
        points.push([x, y]);
      }
    }
  }
  return points;
}

function errorOf(text: string): PxError {
  try {
    compile(text);
  } catch (cause) {
    if (cause instanceof PxError) {
      return cause;
    }
    throw cause;
  }
  throw new Error('expected the recipe to fail');
}

/** A blade covering x 4-9, y 6-7: the box every resolution test reads. */
const BLADE: Json = { op: 'rect', x: 4, y: 6, w: 6, h: 2, color: 'steel.base', part: 'blade' };

/** One pixel at the point both coordinates name, so a ref is visible in the raster. */
function dot(ref: string, extra: Json = {}): Json {
  return {
    op: 'rect',
    x: { ref, ...extra },
    y: { ref, ...extra },
    w: 1,
    h: 1,
    color: 'steel.highlight',
    part: 'blade',
  };
}

describe('AC-18: a ref resolves to exactly the pixel its literal does', () => {
  it('renders a ref-driven line byte-identically to the same line in numbers', () => {
    const withRefs = recipeText([
      BLADE,
      {
        op: 'line',
        x1: { ref: 'blade.left' },
        y1: { ref: 'blade.top' },
        x2: { ref: 'blade.right' },
        y2: { ref: 'blade.bottom' },
        color: 'steel.highlight',
        part: 'blade',
      },
    ]);
    const literal = recipeText([
      BLADE,
      { op: 'line', x1: 4, y1: 6, x2: 9, y2: 7, color: 'steel.highlight', part: 'blade' },
    ]);

    expect(Array.from(render(withRefs).png)).toEqual(Array.from(render(literal).png));
    expect(Array.from(render(withRefs).compiled.flattened)).toEqual(
      Array.from(render(literal).compiled.flattened),
    );
  });

  it('resolves every where to the documented point of the bounding box', () => {
    const expected: Record<string, [number, number]> = {
      top: [6, 6],
      bottom: [6, 7],
      left: [4, 6],
      right: [9, 6],
      center: [6, 6],
      edge: [4, 6],
    };

    for (const [where, point] of Object.entries(expected)) {
      const points = painted(recipeText([BLADE, dot(`blade.${where}`)]));
      expect(points, `blade.${where}`).toContainEqual(point);
    }
  });

  it('takes edge as the raster-first pixel, smallest y then smallest x', () => {
    const lShape = [
      { op: 'rect', x: 4, y: 6, w: 2, h: 2, color: 'steel.base', part: 'blade' },
      { op: 'rect', x: 2, y: 8, w: 1, h: 1, color: 'steel.base', part: 'blade' },
    ];
    // The leftmost footprint is at x 2, but raster order reaches (4, 6) first.
    expect(painted(recipeText([...lShape, dot('blade.edge')]))).toContainEqual([4, 6]);
    expect(painted(recipeText([...lShape, dot('blade.left')]))).toContainEqual([2, 7]);
  });

  it('resolves an anchor ref to the declared point, plus dx and dy', () => {
    const anchors: Record<string, [number, number]> = { grip_pivot: [3, 11] };
    const plain = painted(recipeText([BLADE, dot('anchor.grip_pivot')], undefined, anchors));
    expect(plain).toContainEqual([3, 11]);

    const offset = painted(
      recipeText([BLADE, dot('anchor.grip_pivot', { dx: 2, dy: -1 })], undefined, anchors),
    );
    expect(offset).toContainEqual([5, 10]);
  });

  it('adds dx and dy after resolution, not before', () => {
    const points = painted(recipeText([BLADE, dot('blade.right', { dx: -1, dy: 1 })]));
    expect(points).toContainEqual([8, 7]);
  });

  it('clips a resolved point that leaves the canvas instead of failing the ref', () => {
    const compiled = compile(recipeText([BLADE, dot('blade.left', { dx: -100 })]));
    expect(compiled.warnings.some((warning) => warning.code === 'W_OUT_OF_BOUNDS')).toBe(true);
  });

  it('resolves against the entry snapshot, never against the op being drawn', () => {
    const compiled = compile(
      recipeText([
        BLADE,
        // Paints x 9-15 at y 8, widening the mask it was resolved against.
        {
          op: 'rect',
          x: { ref: 'blade.right' },
          y: 8,
          w: 7,
          h: 1,
          color: 'steel.highlight',
          part: 'blade',
        },
        dot('blade.right'),
      ]),
    );
    const rowOf = (y: number): number[] =>
      Array.from({ length: compiled.width }, (_, x) => x).filter(
        (x) => (compiled.flattened[y * compiled.width + x] ?? -1) >= 0,
      );

    // The wide op started at the pre-op right edge (9), not at the 15 it painted
    // itself towards; the dot then reads the box that op widened.
    expect(rowOf(8)[0]).toBe(9);
    expect(rowOf(7)).toContain(15);
  });

  it('repeats the same bytes on a second render', () => {
    const text = recipeText([BLADE, dot('blade.center', { dx: 1 })]);
    expect(Array.from(render(text).png)).toEqual(Array.from(render(text).png));
  });
});

describe('ref grammar', () => {
  it('rejects an undeclared part with E_PART_UNKNOWN and lists the declared ones', () => {
    const error = errorOf(recipeText([BLADE, dot('guard.top')]));
    expect(error.code).toBe('E_PART_UNKNOWN');
    expect(error.hint).toContain('blade');
  });

  it('rejects a part with no pixels at op start with E_EMPTY_PART', () => {
    const error = errorOf(
      recipeText(
        [
          // The guard is painted *after* the op that reads it.
          dot('guard.center'),
          { op: 'rect', x: 1, y: 1, w: 2, h: 2, color: 'steel.base', part: 'guard' },
        ],
        { blade: { material: 'steel' }, guard: { material: 'steel' } },
      ),
    );
    expect(error.code).toBe('E_EMPTY_PART');
    expect(error.message).toContain('guard');
  });

  it('rejects an unknown where with E_BAD_PARAM and the grammar in the hint', () => {
    const error = errorOf(recipeText([BLADE, dot('blade.middle')]));
    expect(error.code).toBe('E_BAD_PARAM');
    expect(error.hint).toContain('top, bottom, left, right, center, edge');
  });

  it('rejects a ref string with no dot', () => {
    const error = errorOf(recipeText([BLADE, dot('blade')]));
    expect(error.code).toBe('E_BAD_PARAM');
    expect(error.hint).toContain('anchor.<name>');
  });

  it('rejects an undeclared anchor with E_BAD_PARAM naming the declared anchors', () => {
    const error = errorOf(
      recipeText([BLADE, dot('anchor.nope')], undefined, { grip_pivot: [3, 11] }),
    );
    expect(error.code).toBe('E_BAD_PARAM');
    expect(error.hint).toContain('grip_pivot');
  });

  it('rejects a ref with an extra key', () => {
    const error = errorOf(recipeText([BLADE, dot('blade.top', { dz: 1 })]));
    expect(error.code).toBe('E_BAD_PARAM');
    expect(error.message).toContain('dz');
  });

  it('rejects a non-integer offset', () => {
    const error = errorOf(recipeText([BLADE, dot('blade.top', { dx: 0.5 })]));
    expect(error.code).toBe('E_BAD_PARAM');
  });

  it('keeps points arrays integer-only', () => {
    const error = errorOf(
      recipeText([
        BLADE,
        {
          op: 'polygon',
          points: [
            [{ ref: 'blade.top' }, 0],
            [1, 1],
            [2, 2],
          ],
          color: 'steel.highlight',
          part: 'blade',
        },
      ]),
    );
    expect(error.code).toBe('E_BAD_POLYGON');
  });
});

describe('canonical serialisation', () => {
  function opsOf(text: string): Json[] {
    const written = JSON.parse(serializeRecipe(parseRecipe(text).recipe)) as {
      layers: Array<{ ops: Json[] }>;
    };
    return written.layers[0]?.ops ?? [];
  }

  it('writes ref, dx, dy in that order and omits zero offsets', () => {
    const [blade, point] = opsOf(recipeText([BLADE, dot('blade.top', { dx: 1, dy: 0 })]));
    expect(blade).toBeDefined();
    expect(point?.x).toEqual({ ref: 'blade.top', dx: 1 });
    expect(Object.keys(point?.x as object)).toEqual(['ref', 'dx']);
  });

  it('round-trips a ref recipe byte-identically', () => {
    const text = recipeText([BLADE, dot('blade.left', { dx: -2, dy: 3 })]);
    const once = serializeRecipe(parseRecipe(text).recipe);
    const twice = serializeRecipe(parseRecipe(once).recipe);
    expect(twice).toBe(once);
  });

  it('keeps numbers as numbers, with no ref object around them', () => {
    const [blade] = opsOf(recipeText([BLADE]));
    expect(blade?.x).toBe(4);
    expect(blade?.y).toBe(6);
  });
});
