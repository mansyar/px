import { describe, expect, it } from 'vitest';
import { SlotCanvas } from '../../src/core/canvas.js';
import { drawSetPixels, writePoints } from '../../src/core/ops/index.js';
import { bresenham, drawLine, removeCorners } from '../../src/core/ops/line.js';
import { drawRect } from '../../src/core/ops/rect.js';
import { TRANSPARENT_SLOT } from '../../src/core/palette.js';

const SLOT = 3;

describe('SlotCanvas', () => {
  it('starts fully transparent', () => {
    const canvas = new SlotCanvas(4, 3);
    expect(canvas.paintedCount()).toBe(0);
    expect(canvas.get(0, 0)).toBe(TRANSPARENT_SLOT);
    expect(canvas.get(3, 2)).toBe(TRANSPARENT_SLOT);
  });

  it('clips writes outside the canvas and reports them', () => {
    const canvas = new SlotCanvas(4, 4);
    expect(canvas.set(0, 0, SLOT)).toBe(true);
    expect(canvas.set(-1, 0, SLOT)).toBe(false);
    expect(canvas.set(0, 4, SLOT)).toBe(false);
    expect(canvas.set(4, 0, SLOT)).toBe(false);
    expect(canvas.get(-1, 0)).toBe(TRANSPARENT_SLOT);
    expect(canvas.paintedCount()).toBe(1);
  });
});

describe('set_pixels', () => {
  it('writes every point once', () => {
    const canvas = new SlotCanvas(4, 4);
    const clipped = drawSetPixels(
      canvas,
      [
        [1, 1],
        [2, 2],
        [2, 2],
      ],
      SLOT,
    );
    expect(clipped).toBe(false);
    expect(canvas.get(1, 1)).toBe(SLOT);
    expect(canvas.get(2, 2)).toBe(SLOT);
    expect(canvas.paintedCount()).toBe(2);
  });

  it('skips points outside the canvas and reports one clip', () => {
    const canvas = new SlotCanvas(4, 4);
    expect(
      writePoints(
        canvas,
        [
          [0, 0],
          [-3, 9],
        ],
        SLOT,
      ),
    ).toBe(true);
    expect(canvas.get(0, 0)).toBe(SLOT);
    expect(canvas.paintedCount()).toBe(1);
  });
});

describe('rect', () => {
  it('fills the inclusive rectangle', () => {
    const canvas = new SlotCanvas(6, 6);
    expect(drawRect(canvas, 1, 1, 3, 2, SLOT)).toBe(false);
    expect(canvas.paintedCount()).toBe(6);
    expect(canvas.get(1, 1)).toBe(SLOT);
    expect(canvas.get(3, 2)).toBe(SLOT);
    expect(canvas.get(4, 2)).toBe(TRANSPARENT_SLOT);
  });

  it('clips a partly outside rectangle and reports it', () => {
    const canvas = new SlotCanvas(6, 6);
    expect(drawRect(canvas, -2, -2, 4, 4, SLOT)).toBe(true);
    expect(canvas.paintedCount()).toBe(4);
    expect(canvas.get(0, 0)).toBe(SLOT);
    expect(canvas.get(1, 1)).toBe(SLOT);
  });
});

describe('line', () => {
  it('walks a horizontal line inclusive of both endpoints', () => {
    expect(bresenham(0, 2, 3, 2)).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ]);
  });

  it('walks a vertical line inclusive of both endpoints', () => {
    expect(bresenham(2, 0, 2, 2)).toEqual([
      [2, 0],
      [2, 1],
      [2, 2],
    ]);
  });

  it('walks a descending diagonal', () => {
    expect(bresenham(0, 0, 2, 2)).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });

  it('never repeats and never skips a step in any octant', () => {
    const points = bresenham(1, 1, 6, 3);
    expect(points[0]).toEqual([1, 1]);
    expect(points.at(-1)).toEqual([6, 3]);
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1] as [number, number];
      const current = points[index] as [number, number];
      expect(Math.abs(current[0] - previous[0])).toBeLessThanOrEqual(1);
      expect(Math.abs(current[1] - previous[1])).toBeLessThanOrEqual(1);
      expect(current).not.toEqual(previous);
    }
  });

  it('paints the expected pixels on a canvas', () => {
    const canvas = new SlotCanvas(5, 5);
    expect(drawLine(canvas, 0, 0, 4, 4, SLOT)).toBe(false);
    expect(canvas.paintedCount()).toBe(5);
    for (let index = 0; index < 5; index += 1) {
      expect(canvas.get(index, index)).toBe(SLOT);
    }
  });

  it('keeps straight runs untouched by corner removal', () => {
    const points = bresenham(0, 0, 4, 0);
    expect(removeCorners(points)).toEqual(points);
  });

  it('drops an L-turn so a stroke stays one pixel thick', () => {
    const points: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [1, 1],
    ];
    expect(removeCorners(points)).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });
});
