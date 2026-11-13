import { describe, expect, it } from 'vitest';
import { base, compileOps, countPainted } from '../ops/helpers.js';
import {
  columnHeights,
  incrementGaps,
  isEightConnected,
  longestEqualRun,
  paintedPoints,
} from './support.js';

describe('stroke — L-turn cleanup (FR-6)', () => {
  it('drops the corner of an open right angle that two `line` ops keep', () => {
    const stroke = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [0, 0],
            [6, 0],
            [6, 6],
          ],
          color: 'ink.0',
        },
      ],
      { width: 16, height: 16 },
    );
    const lines = compileOps(
      [
        { op: 'line', x1: 0, y1: 0, x2: 6, y2: 0, color: 'ink.0' },
        { op: 'line', x1: 6, y1: 0, x2: 6, y2: 6, color: 'ink.0' },
      ],
      { width: 16, height: 16 },
    );
    // `line` paints the corner as part of both segments; the stroke drops the L
    // and leaves (5,0) diagonal to (6,1), so the corner is one pixel thinner.
    expect(base(lines.compiled).get(6, 0)).not.toBe(-1);
    expect(base(stroke.compiled).get(6, 0)).toBe(-1);
    expect(base(stroke.compiled).get(5, 0)).not.toBe(-1);
    expect(base(stroke.compiled).get(6, 1)).not.toBe(-1);
    expect(countPainted(base(stroke.compiled))).toBe(12);
    expect(isEightConnected(paintedPoints(base(stroke.compiled)))).toBe(true);
  });

  it('keeps (5,0) and (6,1) diagonal, so the corner has no 4-way gap', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [0, 0],
            [6, 0],
            [6, 6],
          ],
          color: 'ink.0',
        },
      ],
      { width: 16, height: 16 },
    );
    const canvas = base(compiled);
    expect(canvas.get(5, 1)).toBe(-1);
    expect(canvas.get(6, 1)).not.toBe(-1);
    expect(canvas.get(5, 0)).not.toBe(-1);
  });
});

describe('stroke — staircase cleanup (FR-6, AC-5)', () => {
  const diagonal = [
    [0, 0],
    [255, 127],
  ];

  function heights(ops: unknown[]): number[] {
    const { compiled } = compileOps(ops, { width: 256, height: 256 });
    return columnHeights(base(compiled));
  }

  it('breaks the regular cadence a Bresenham diagonal has', () => {
    const line = heights([{ op: 'line', x1: 0, y1: 0, x2: 255, y2: 127, color: 'ink.0' }]);
    const stroke = heights([{ op: 'stroke', path: diagonal, color: 'ink.0' }]);

    const lineGaps = incrementGaps(line);
    const strokeGaps = incrementGaps(stroke);

    // `line` increments on a fixed rational cadence: long runs of the same step.
    expect(longestEqualRun(lineGaps)).toBeGreaterThanOrEqual(8);
    // The stroke spreads the same increments so no step run repeats for long.
    expect(longestEqualRun(strokeGaps)).toBeLessThanOrEqual(3);
    expect(lineGaps).not.toEqual(strokeGaps);
  });

  it('still lands exactly on both endpoints, one pixel per column', () => {
    const stroke = heights([{ op: 'stroke', path: diagonal, color: 'ink.0' }]);
    expect(stroke).toHaveLength(256);
    expect(stroke[0]).toBe(0);
    expect(stroke[255]).toBe(127);
    expect(stroke.every((height) => height >= 0)).toBe(true);
  });

  it('keeps the diagonal 8-connected with no gap', () => {
    const { compiled } = compileOps([{ op: 'stroke', path: diagonal, color: 'ink.0' }], {
      width: 256,
      height: 256,
    });
    expect(isEightConnected(paintedPoints(base(compiled)))).toBe(true);
  });

  it('draws a 45 degree path as one unbroken diagonal', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [0, 0],
            [63, 63],
          ],
          color: 'ink.0',
        },
      ],
      {
        width: 64,
        height: 64,
      },
    );
    const canvas = base(compiled);
    expect(countPainted(canvas)).toBe(64);
    for (let step = 0; step < 64; step += 1) {
      expect(canvas.get(step, step)).not.toBe(-1);
    }
  });
});

describe('stroke — smoothing (FR-7, AC-7)', () => {
  it('rounds a right angle into a connected chamfer', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [1, 1],
            [9, 1],
            [9, 9],
          ],
          color: 'ink.0',
          smooth: true,
        },
      ],
      { width: 16, height: 16 },
    );
    const canvas = base(compiled);
    expect(canvas.get(9, 1)).toBe(-1);
    expect(canvas.get(7, 1)).not.toBe(-1);
    expect(canvas.get(8, 2)).not.toBe(-1);
    expect(canvas.get(9, 3)).not.toBe(-1);
    expect(canvas.get(1, 1)).not.toBe(-1);
    expect(canvas.get(9, 9)).not.toBe(-1);
    expect(countPainted(canvas)).toBe(15);
    expect(isEightConnected(paintedPoints(canvas))).toBe(true);
  });

  it('leaves a two-point path alone', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [1, 1],
            [9, 1],
          ],
          color: 'ink.0',
          smooth: true,
        },
      ],
      { width: 16, height: 16 },
    );
    expect(countPainted(base(compiled))).toBe(9);
  });

  it('does not introduce a diagonal gap at a shallow bend', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [0, 0],
            [8, 0],
            [13, 3],
          ],
          color: 'ink.0',
          smooth: true,
        },
      ],
      { width: 16, height: 16 },
    );
    expect(isEightConnected(paintedPoints(base(compiled)))).toBe(true);
  });
});
