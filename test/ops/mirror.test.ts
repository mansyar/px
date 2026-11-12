import { describe, expect, it } from 'vitest';
import { drawMirror } from '../../src/core/ops/mirror.js';
import { base, CountingCanvas, compileOps, countPainted, paint } from './helpers.js';

function mirrorOp(
  axis: 'x' | 'y',
  pivot: number,
): { op: 'mirror'; axis: 'x' | 'y'; pivot: number } {
  return { op: 'mirror', axis, pivot };
}

describe('mirror', () => {
  it('reflects across a half-pixel pivot without a seam row', () => {
    const { compiled } = compileOps(
      [{ op: 'set_pixels', points: [[1, 2]], color: 'ink.0' }, mirrorOp('x', 2.5)],
      { width: 8, height: 8 },
    );
    expect(paint(base(compiled))[2]).toBe('.#..#...');
  });

  it('reflects across an integer pivot and leaves a one-pixel seam', () => {
    const { compiled } = compileOps(
      [{ op: 'set_pixels', points: [[0, 1]], color: 'ink.0' }, mirrorOp('x', 3)],
      { width: 8, height: 8 },
    );
    const canvas = base(compiled);
    expect(paint(canvas)[1]).toBe('#.....#.');
    expect(canvas.get(3, 1)).toBe(-1);
  });

  it('writes every destination once, including at the seam', () => {
    const canvas = new CountingCanvas(8, 8);
    canvas.set(3, 0, 1);
    canvas.set(6, 0, 1);
    // Integer pivot 3: 6 -> 0, and the seam column 3 maps onto itself.
    drawMirror(canvas, 'x', 3);
    expect(canvas.maxWrites()).toBe(1);
    expect(canvas.writes.get('3,0')).toBe(1);
    expect(canvas.writes.get('0,0')).toBe(1);
  });

  it('mirrors a source once and never re-mirrors the copy', () => {
    const { compiled } = compileOps(
      [{ op: 'set_pixels', points: [[5, 0]], color: 'ink.0' }, mirrorOp('x', 2.5)],
      { width: 8, height: 8 },
    );
    // 5 -> 0 only; 0 must not be reflected back to 5 a second time.
    expect(paint(base(compiled))[0]).toBe('#....#..');
    expect(countPainted(base(compiled))).toBe(2);
  });

  it('mirrors vertically with axis y', () => {
    const { compiled } = compileOps(
      [{ op: 'set_pixels', points: [[2, 1]], color: 'ink.0' }, mirrorOp('y', 2.5)],
      { width: 8, height: 8 },
    );
    const canvas = base(compiled);
    expect(canvas.get(2, 4)).toBe(compiled.slots.resolve('ink.0'));
    expect(countPainted(canvas)).toBe(2);
  });

  it('skips transparent source pixels, so nothing is mirrored around them', () => {
    const { compiled } = compileOps([mirrorOp('x', 3.5)], { width: 8, height: 8 });
    expect(countPainted(base(compiled))).toBe(0);
  });

  it('rejects a pivot that is not on a pixel or half-pixel grid', () => {
    expect(() => compileOps([mirrorOp('x', 2.25)])).toThrowError(/pivot/);
  });

  it('clips a destination outside the canvas and warns', () => {
    const { compiled } = compileOps(
      [{ op: 'set_pixels', points: [[7, 0]], color: 'ink.0' }, mirrorOp('x', 7.5)],
      { width: 8, height: 8 },
    );
    expect(compiled.warnings.some((warning) => warning.code === 'W_OUT_OF_BOUNDS')).toBe(true);
  });
});
