import { describe, expect, it } from 'vitest';
import { drawEllipse, ellipseRowSpan } from '../../src/core/ops/ellipse.js';
import { base, CountingCanvas, compileOps, countPainted, paint } from './helpers.js';

describe('ellipse', () => {
  it('draws a one-pixel boundary with a single centre row and column at odd sizes', () => {
    const { compiled } = compileOps([{ op: 'ellipse', x: 1, y: 1, w: 5, h: 5, color: 'ink.0' }], {
      width: 8,
      height: 8,
    });
    // Odd diameter: row 3 and column 3 are the only centre lines, and the
    // corners are cut rather than rounded off.
    expect(paint(base(compiled)).slice(1, 6)).toEqual([
      '..###...',
      '.#...#..',
      '.#...#..',
      '.#...#..',
      '..###...',
    ]);
  });

  it('fills the same spans, so fill and outline agree', () => {
    const { compiled } = compileOps(
      [{ op: 'ellipse', x: 1, y: 1, w: 5, h: 5, color: 'ink.0', fill: true }],
      { width: 8, height: 8 },
    );
    expect(paint(base(compiled)).slice(1, 6)).toEqual([
      '..###...',
      '.#####..',
      '.#####..',
      '.#####..',
      '..###...',
    ]);
  });

  it('gives an even diameter two identical centre rows', () => {
    const { compiled } = compileOps([{ op: 'ellipse', x: 0, y: 0, w: 6, h: 4, color: 'ink.0' }], {
      width: 8,
      height: 8,
    });
    const rows = paint(base(compiled)).slice(0, 4);
    expect(rows).toEqual(['.####...', '#....#..', '#....#..', '.####...']);
    expect(rows[1]).toBe(rows[2]);
  });

  it('keeps every row of a two-pixel-wide ellipse inside the shape', () => {
    const { compiled } = compileOps(
      [{ op: 'ellipse', x: 0, y: 0, w: 2, h: 6, color: 'ink.0', fill: true }],
      { width: 8, height: 8 },
    );
    const rows = paint(base(compiled)).slice(0, 6);
    for (const row of rows) {
      expect(row.slice(0, 2)).toBe('##');
    }
  });

  it('degrades a one-pixel-wide or one-pixel-tall box to a straight line', () => {
    const vertical = compileOps([{ op: 'ellipse', x: 2, y: 1, w: 1, h: 4, color: 'ink.0' }], {
      width: 8,
      height: 8,
    });
    expect(paint(base(vertical.compiled)).slice(1, 5)).toEqual([
      '..#.....',
      '..#.....',
      '..#.....',
      '..#.....',
    ]);

    const horizontal = compileOps([{ op: 'ellipse', x: 1, y: 2, w: 4, h: 1, color: 'ink.0' }], {
      width: 8,
      height: 8,
    });
    expect(paint(base(horizontal.compiled))[2]).toBe('.####...');
  });

  it('draws a single pixel when both diameters are one', () => {
    const { compiled } = compileOps([{ op: 'ellipse', x: 3, y: 3, w: 1, h: 1, color: 'ink.0' }], {
      width: 8,
      height: 8,
    });
    expect(paint(base(compiled))[3]).toBe('...#....');
  });

  it('paints each boundary pixel once', () => {
    const canvas = new CountingCanvas(9, 7);
    drawEllipse(canvas, 0, 0, 9, 7, 0);
    expect(canvas.maxWrites()).toBe(1);
    expect(countPainted(canvas)).toBeGreaterThan(8);
  });

  it('rejects a zero diameter at parse time', () => {
    expect(() =>
      compileOps([{ op: 'ellipse', x: 0, y: 0, w: 0, h: 4, color: 'ink.0' }]),
    ).toThrowError(/non-positive size/);
  });

  it('clips and warns when part of the ellipse is outside the canvas', () => {
    const { compiled } = compileOps([{ op: 'ellipse', x: -2, y: 2, w: 5, h: 5, color: 'ink.0' }], {
      width: 8,
      height: 8,
    });
    expect(compiled.warnings.some((warning) => warning.code === 'W_OUT_OF_BOUNDS')).toBe(true);
    // The top cap is clipped on the left but still writes the pixels inside.
    expect(paint(base(compiled))[2]).toBe('##......');
  });

  it('computes spans from pixel centres, not box corners', () => {
    // A 3x3 box: every centre is inside a circle of radius 1.5, so no corner is cut.
    expect(ellipseRowSpan(0, 3, 3)).toEqual([0, 2]);
    expect(ellipseRowSpan(1, 3, 3)).toEqual([0, 2]);
    // A 4x4 box leaves the two middle columns on its top row.
    expect(ellipseRowSpan(0, 4, 4)).toEqual([1, 2]);
  });
});
