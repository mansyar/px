/**
 * Scanline polygon fill.
 *
 * The rules below are the whole op, and the seam behaviour depends on them:
 *
 * 1. A scanline samples pixel centres, so row `y` is the horizontal line at
 *    `y + 0.5`.
 * 2. An edge covers rows `[min(y1, y2), max(y1, y2))` — half-open in y. A shared
 *    vertex between two edges is therefore counted by exactly one of them, and
 *    a horizontal edge covers no rows at all. That is what stops two polygons
 *    that share an edge from painting it twice.
 * 3. Intersections are sorted and paired (even-odd rule). A span covers pixels
 *    whose centre is in `[left, right)` — half-open on the right too, for the
 *    same reason: the pixel whose centre lands exactly on the right boundary
 *    belongs to the polygon on the other side.
 *
 * Zero anti-aliasing follows from the pixel-centre sample: a pixel is either in
 * the span or it is not.
 */

import type { SlotCanvas } from '../canvas.js';
import type { Point } from './write-points.js';

/** Horizontal spans of the polygon on scanline `y`, as inclusive pixel ranges. */
export function polygonSpans(
  points: ReadonlyArray<readonly [number, number]>,
  y: number,
): Array<[number, number]> {
  const sample = y + 0.5;
  const crossings: number[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = points[(index + 1) % points.length];
    if (start === undefined || end === undefined) {
      continue;
    }
    const low = Math.min(start[1], end[1]);
    const high = Math.max(start[1], end[1]);
    if (sample < low || sample >= high) {
      continue;
    }
    const t = (sample - start[1]) / (end[1] - start[1]);
    crossings.push(start[0] + t * (end[0] - start[0]));
  }

  crossings.sort((a, b) => a - b);
  const spans: Array<[number, number]> = [];
  for (let index = 0; index + 1 < crossings.length; index += 2) {
    const left = crossings[index];
    const right = crossings[index + 1];
    if (left === undefined || right === undefined) {
      continue;
    }
    // Pixel centre `x + 0.5` in `[left, right)` inverts to this range.
    // `+ 0` keeps ceil(-0.5)'s -0 out of the span.
    const first = Math.ceil(left - 0.5) + 0;
    const last = Math.ceil(right - 0.5) - 1;
    if (first <= last) {
      spans.push([first, last]);
    }
  }
  return spans;
}

export function drawPolygon(canvas: SlotCanvas, points: readonly Point[], slot: number): boolean {
  let clipped = false;
  for (const [x, y] of points) {
    if (!canvas.inBounds(x, y)) {
      clipped = true;
    }
  }

  for (let y = 0; y < canvas.height; y += 1) {
    for (const [first, last] of polygonSpans(points, y)) {
      for (let x = first; x <= last; x += 1) {
        if (!canvas.set(x, y, slot)) {
          clipped = true;
        }
      }
    }
  }

  return clipped;
}
