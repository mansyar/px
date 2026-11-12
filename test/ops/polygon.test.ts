import { describe, expect, it } from 'vitest';
import { drawPolygon, polygonSpans } from '../../src/core/ops/polygon.js';
import { base, CountingCanvas, compileOps, paint } from './helpers.js';

const SQUARE: Array<[number, number]> = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
];

describe('polygon', () => {
  it('fills a square up to but not including the far edge', () => {
    const { compiled } = compileOps([{ op: 'polygon', points: SQUARE, color: 'ink.0' }], {
      width: 8,
      height: 8,
    });
    expect(paint(base(compiled)).slice(0, 5)).toEqual([
      '####....',
      '####....',
      '####....',
      '####....',
      '........',
    ]);
  });

  it('fills a triangle with no seam at the shared vertex', () => {
    const points: Array<[number, number]> = [
      [0, 0],
      [4, 0],
      [0, 4],
    ];
    const { compiled } = compileOps([{ op: 'polygon', points, color: 'ink.0' }], {
      width: 8,
      height: 8,
    });
    expect(paint(base(compiled)).slice(0, 4)).toEqual([
      '###.....',
      '##......',
      '#.......',
      '........',
    ]);
  });

  it('samples pixel centres at y + 0.5 and covers a row exactly once', () => {
    const band: Array<[number, number]> = [
      [0, 1],
      [4, 1],
      [4, 3],
      [0, 3],
    ];
    expect(polygonSpans(band, 0)).toEqual([]);
    expect(polygonSpans(band, 1)).toEqual([[0, 3]]);
    expect(polygonSpans(band, 2)).toEqual([[0, 3]]);
    // y = 3 is the far edge, and edges are half-open there.
    expect(polygonSpans(band, 3)).toEqual([]);
  });

  it('does not paint the shared edge of two adjacent polygons twice', () => {
    const canvas = new CountingCanvas(8, 8);
    drawPolygon(canvas, SQUARE, 1);
    drawPolygon(
      canvas,
      [
        [4, 0],
        [8, 0],
        [8, 4],
        [4, 4],
      ],
      1,
    );
    expect(canvas.maxWrites()).toBe(1);
    expect(paint(canvas)[0]).toBe('########');
  });

  it('counts a shared vertex once, so the seam row is not doubled', () => {
    const left: Array<[number, number]> = [
      [0, 0],
      [2, 0],
      [2, 2],
    ];
    const right: Array<[number, number]> = [
      [2, 0],
      [4, 0],
      [2, 2],
    ];
    const canvas = new CountingCanvas(8, 8);
    drawPolygon(canvas, left, 1);
    drawPolygon(canvas, right, 1);
    expect(canvas.maxWrites()).toBe(1);
    expect(paint(canvas).slice(0, 3)).toEqual(['###.....', '.#......', '........']);
  });

  it('rejects fewer than three points', () => {
    expect(() =>
      compileOps([
        {
          op: 'polygon',
          points: [
            [0, 0],
            [2, 2],
          ],
          color: 'ink.0',
        },
      ]),
    ).toThrowError(/at least 3 are required/);
  });

  it('clips and warns when a vertex is outside the canvas', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'polygon',
          points: [
            [-2, 0],
            [2, 0],
            [2, 2],
          ],
          color: 'ink.0',
        },
      ],
      { width: 8, height: 8 },
    );
    expect(compiled.warnings.some((warning) => warning.code === 'W_OUT_OF_BOUNDS')).toBe(true);
  });
});
