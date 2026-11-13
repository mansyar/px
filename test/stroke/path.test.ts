import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import { base, compileOps, countPainted, paint } from '../ops/helpers.js';
import { isEightConnected, paintedPoints } from './support.js';

function codeOf(run: () => void): string {
  try {
    run();
    return 'NO_THROW';
  } catch (error) {
    return error instanceof PxError ? error.code : 'NOT_PX';
  }
}

describe('stroke — the path rasteriser (FR-5)', () => {
  it('chains every segment through a polyline joint', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [0, 0],
            [8, 0],
            [13, 2],
          ],
          color: 'ink.0',
        },
      ],
      { width: 16, height: 16 },
    );
    const canvas = base(compiled);
    expect(paint(canvas)[0]?.slice(0, 9)).toBe('#########');
    expect(canvas.get(8, 0)).not.toBe(-1);
    expect(canvas.get(13, 2)).not.toBe(-1);
    // 9 pixels along y=0, then the second segment shares its joint.
    expect(countPainted(canvas)).toBe(14);
    expect(isEightConnected(paintedPoints(canvas))).toBe(true);
  });

  it('draws nothing on an axis it does not travel', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [3, 2],
            [3, 9],
          ],
          color: 'ink.0',
        },
      ],
      {
        width: 16,
        height: 16,
      },
    );
    const canvas = base(compiled);
    expect(countPainted(canvas)).toBe(8);
    expect(canvas.get(3, 2)).not.toBe(-1);
    expect(canvas.get(3, 9)).not.toBe(-1);
    expect(canvas.get(4, 5)).toBe(-1);
  });

  it('deduplicates repeated consecutive points instead of rejecting them', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [2, 2],
            [2, 2],
            [7, 2],
            [7, 2],
            [7, 2],
          ],
          color: 'ink.0',
        },
      ],
      { width: 16, height: 16 },
    );
    expect(countPainted(base(compiled))).toBe(6);
  });

  it('rejects a path with fewer than two points', () => {
    expect(codeOf(() => compileOps([{ op: 'stroke', path: [[3, 3]], color: 'ink.0' }]))).toBe(
      'E_BAD_PATH',
    );
  });

  it('rejects a path that collapses to one point after deduplication', () => {
    expect(
      codeOf(() =>
        compileOps([
          {
            op: 'stroke',
            path: [
              [3, 3],
              [3, 3],
            ],
            color: 'ink.0',
          },
        ]),
      ),
    ).toBe('E_BAD_PATH');
  });

  it('rejects a path point that is not an integer pair', () => {
    expect(
      codeOf(() =>
        compileOps([
          {
            op: 'stroke',
            path: [
              [0, 0],
              [1.5, 2],
            ],
            color: 'ink.0',
          },
        ]),
      ),
    ).toBe('E_BAD_PATH');
  });

  it('requires the path parameter', () => {
    expect(codeOf(() => compileOps([{ op: 'stroke', color: 'ink.0' }]))).toBe('E_MISSING_PARAM');
  });
});

describe('stroke — closure (FR-5, AC-6)', () => {
  it('joins the last vertex to the first with the seam pixel present', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [4, 4],
            [59, 4],
            [59, 59],
            [4, 59],
          ],
          color: 'ink.0',
          closed: true,
        },
      ],
      { width: 64, height: 64 },
    );
    const canvas = base(compiled);
    // The start pixel is the seam the closing segment lands on (AC-6).
    expect(canvas.get(4, 4)).not.toBe(-1);
    // 56 px per side, corners shared: 220 on the perimeter, less three chamfered
    // far corners; the seam corner is kept so the join is not a hole.
    expect(countPainted(canvas)).toBe(217);
    expect(canvas.get(59, 4)).toBe(-1);
    expect(isEightConnected(paintedPoints(canvas))).toBe(true);
  });

  it('leaves an open path unclosed', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'stroke',
          path: [
            [4, 4],
            [59, 4],
            [59, 59],
          ],
          color: 'ink.0',
        },
      ],
      { width: 64, height: 64 },
    );
    const canvas = base(compiled);
    expect(canvas.get(59, 4)).toBe(-1);
    expect(isEightConnected(paintedPoints(canvas))).toBe(true);
  });
});
