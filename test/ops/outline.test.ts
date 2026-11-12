import { describe, expect, it } from 'vitest';
import { base, compileOps, countPainted, INK_ALT, paint, roleRows, SHADED } from './helpers.js';

const BLOCK = { op: 'rect', x: 2, y: 2, w: 4, h: 4, color: 'ink.0' };

describe('auto_outline', () => {
  it('grows the silhouette by exactly one pixel in outer mode', () => {
    const { compiled } = compileOps(
      [BLOCK, { op: 'auto_outline', mode: '4-way', where: 'outer', color: 'alt.0' }],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    expect(paint(base(compiled)).slice(1, 7)).toEqual([
      '..####..',
      '.######.',
      '.######.',
      '.######.',
      '.######.',
      '..####..',
    ]);
    // The 4x4 source is 16 pixels; the ring adds its 16-pixel perimeter.
    expect(countPainted(base(compiled))).toBe(32);
    expect(base(compiled).get(1, 1)).toBe(-1);
  });

  it('fills the ring corners in 8-way mode', () => {
    const four = compileOps(
      [BLOCK, { op: 'auto_outline', mode: '4-way', where: 'outer', color: 'alt.0' }],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    const eight = compileOps(
      [BLOCK, { op: 'auto_outline', mode: '8-way', where: 'outer', color: 'alt.0' }],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    expect(base(four.compiled).get(1, 1)).toBe(-1);
    expect(base(eight.compiled).get(1, 1)).toBe(eight.compiled.slots.resolve('alt.0'));
    expect(countPainted(base(eight.compiled))).toBe(36);
  });

  it('shrinks nothing in inner mode, it replaces the opaque border', () => {
    const outer = compileOps(
      [BLOCK, { op: 'auto_outline', mode: '4-way', where: 'outer', color: 'alt.0' }],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    const inner = compileOps(
      [BLOCK, { op: 'auto_outline', mode: '4-way', where: 'inner', color: 'alt.0' }],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    const innerCanvas = base(inner.compiled);
    expect(countPainted(innerCanvas)).toBe(16);
    expect(paint(innerCanvas).slice(1, 7)).toEqual([
      '........',
      '..####..',
      '..####..',
      '..####..',
      '..####..',
      '........',
    ]);
    // Border replaced, interior kept.
    expect(innerCanvas.get(2, 2)).toBe(inner.compiled.slots.resolve('alt.0'));
    expect(innerCanvas.get(3, 3)).toBe(inner.compiled.slots.resolve('ink.0'));
    // Outer writes only outside the source box; inner only inside it.
    expect(base(outer.compiled).get(2, 2)).toBe(outer.compiled.slots.resolve('ink.0'));
    expect(innerCanvas.get(1, 2)).toBe(-1);
  });

  it('uses the neighbouring family outline role when selective', () => {
    const { compiled } = compileOps(
      [
        { op: 'rect', x: 2, y: 2, w: 4, h: 4, color: 'cloth.base' },
        { op: 'auto_outline', mode: '4-way', where: 'outer', selective: true },
      ],
      { palette: SHADED, width: 8, height: 8 },
    );
    const rows = roleRows(compiled);
    expect(rows[1]).toBe('..oooo..');
    expect(rows[2]).toBe('.obbbbo.');
    expect(base(compiled).get(2, 1)).toBe(compiled.slots.resolve('cloth.outline'));
    expect(base(compiled).get(2, 2)).toBe(compiled.slots.resolve('cloth.base'));
  });

  it('draws the outline in the pixel own family when selective and inner', () => {
    const { compiled } = compileOps(
      [
        { op: 'rect', x: 2, y: 2, w: 4, h: 4, color: 'cloth.base' },
        { op: 'auto_outline', mode: '4-way', where: 'inner', selective: true },
      ],
      { palette: SHADED, width: 8, height: 8 },
    );
    const rows = roleRows(compiled);
    expect(rows[2]).toBe('..oooo..');
    expect(rows[3]).toBe('..obbo..');
  });

  it('is a no-op with a warning when the target layer is empty', () => {
    const { compiled } = compileOps([{ op: 'auto_outline', color: 'alt.0' }], {
      palette: INK_ALT,
      width: 8,
      height: 8,
    });
    expect(countPainted(base(compiled))).toBe(0);
    expect(compiled.warnings.some((warning) => warning.code === 'W_PASS_NOOP')).toBe(true);
  });
});

describe('auto_outline thickness', () => {
  const BOX = { op: 'rect', x: 6, y: 6, w: 4, h: 4, color: 'ink.0' };
  const outline = (extra: Record<string, unknown> = {}) => ({
    op: 'auto_outline',
    mode: '4-way',
    where: 'outer',
    color: 'alt.0',
    ...extra,
  });

  it('takes its depth from the profile when the op names no width', () => {
    const small = compileOps([BOX, outline()], { palette: INK_ALT, width: 32, height: 32 });
    const large = compileOps([BOX, outline()], { palette: INK_ALT, width: 160, height: 160 });
    // `small` recommends 1 px and `large` 2 px, so the second ring only exists
    // on the large canvas.
    expect(base(small.compiled).get(5, 6)).toBe(small.compiled.slots.resolve('alt.0'));
    expect(base(small.compiled).get(4, 6)).toBe(-1);
    expect(base(large.compiled).get(5, 6)).toBe(large.compiled.slots.resolve('alt.0'));
    expect(base(large.compiled).get(4, 6)).toBe(large.compiled.slots.resolve('alt.0'));
    expect(base(large.compiled).get(3, 6)).toBe(-1);
  });

  it('lets an explicit width win over the profile in both directions', () => {
    const thin = compileOps([BOX, outline({ width: 1 })], {
      palette: INK_ALT,
      width: 160,
      height: 160,
    });
    const thick = compileOps([BOX, outline({ width: 3 })], {
      palette: INK_ALT,
      width: 32,
      height: 32,
    });
    expect(base(thin.compiled).get(4, 6)).toBe(-1);
    expect(base(thick.compiled).get(3, 6)).not.toBe(-1);
    expect(base(thick.compiled).get(2, 6)).toBe(-1);
  });

  it('rejects a width outside 1-4', () => {
    expect(() => compileOps([BOX, outline({ width: 5 })], { palette: INK_ALT })).toThrow(
      /outside 1-4/,
    );
  });

  it('runs an inner border the same depth, keeping the interior', () => {
    const box = { op: 'rect', x: 6, y: 6, w: 6, h: 6, color: 'ink.0' };
    const { compiled } = compileOps(
      [box, { op: 'auto_outline', where: 'inner', width: 2, color: 'alt.0' }],
      {
        palette: INK_ALT,
        width: 32,
        height: 32,
      },
    );
    expect(base(compiled).get(6, 6)).toBe(compiled.slots.resolve('alt.0'));
    expect(base(compiled).get(7, 7)).toBe(compiled.slots.resolve('alt.0'));
    expect(base(compiled).get(8, 8)).toBe(compiled.slots.resolve('ink.0'));
  });
});
