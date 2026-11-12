import type { SlotCanvas } from '../canvas.js';
import { type Point, writePoints } from './write-points.js';

/**
 * Integer Bresenham line, endpoint inclusive, all octants.
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

export function drawLine(
  canvas: SlotCanvas,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  slot: number,
): boolean {
  return writePoints(canvas, bresenham(x1, y1, x2, y2), slot);
}
