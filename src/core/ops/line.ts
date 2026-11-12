import type { SlotCanvas } from '../canvas.js';
import { type Point, writePoints } from './write-points.js';

/**
 * Integer Bresenham line, endpoint inclusive, all octants.
 *
 * The pixel-perfect pass is the standard corner removal: a pixel that shares a
 * row with one neighbour and a column with the other is an L-turn, so it is
 * dropped to keep the stroke one pixel thick. Applied to Bresenham output it is
 * usually a no-op, which is why the behaviour is pinned by unit tests rather
 * than by a golden that cannot move.
 */
export function bresenham(x1: number, y1: number, x2: number, y2: number): Point[] {
  const points: Point[] = [];
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const stepX = x1 < x2 ? 1 : -1;
  const stepY = y1 < y2 ? 1 : -1;
  let error = dx - dy;
  let x = x1;
  let y = y1;

  for (;;) {
    points.push([x, y]);
    if (x === x2 && y === y2) {
      return points;
    }
    const doubled = 2 * error;
    if (doubled > -dy) {
      error -= dy;
      x += stepX;
    }
    if (doubled < dx) {
      error += dx;
      y += stepY;
    }
  }
}

export function removeCorners(points: ReadonlyArray<readonly [number, number]>): Point[] {
  const kept: Point[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];
    const next = points[index + 1];
    if (previous !== undefined && next !== undefined) {
      const previousHorizontal = previous[1] === current[1] && previous[0] !== current[0];
      const previousVertical = previous[0] === current[0] && previous[1] !== current[1];
      const nextHorizontal = next[1] === current[1] && next[0] !== current[0];
      const nextVertical = next[0] === current[0] && next[1] !== current[1];
      if ((previousHorizontal && nextVertical) || (previousVertical && nextHorizontal)) {
        continue;
      }
    }
    kept.push([current[0], current[1]]);
  }
  return kept;
}

export function drawLine(
  canvas: SlotCanvas,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  slot: number,
  pixelPerfect = false,
): boolean {
  const points = bresenham(x1, y1, x2, y2);
  return writePoints(canvas, pixelPerfect ? removeCorners(points) : points, slot);
}
