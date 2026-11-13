/**
 * Fill ops. Both read a snapshot of the active layer, so an op never consumes
 * its own output and replaying it is order-independent.
 */

import type { SlotCanvas } from '../canvas.js';
import { TRANSPARENT_SLOT } from '../palette.js';
import type { DitherPattern } from '../recipe/types.js';

/**
 * 4x4 Bayer matrix, `0..15` lightest to darkest slot in the usual rendering.
 * Used as a threshold table, not as an interpolator.
 */
export const BAYER_4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** `bayer_25` paints the quarter of cells below 25% coverage. */
const BAYER_25_CUTOFF = 4;

/**
 * True when the pattern paints the pixel at absolute canvas coordinates. The
 * pattern keys off the canvas, never off the op's origin, so two overlapping
 * dithered rects interlock instead of clashing.
 */
export function ditherPaints(pattern: DitherPattern, x: number, y: number): boolean {
  if (pattern === 'checker_50') {
    return (x + y) % 2 === 0;
  }
  const row = BAYER_4[y & 3];
  const value = row?.[x & 3];
  return value !== undefined && value < BAYER_25_CUTOFF;
}

export function drawDitherFill(
  canvas: SlotCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  slot: number,
  pattern: DitherPattern,
  owner?: number,
): boolean {
  let clipped = false;
  for (let row = 0; row < h; row += 1) {
    for (let column = 0; column < w; column += 1) {
      const px = x + column;
      const py = y + row;
      if (!ditherPaints(pattern, px, py)) {
        continue;
      }
      if (!canvas.set(px, py, slot, owner)) {
        clipped = true;
      }
    }
  }
  return clipped;
}

/**
 * Flood fill from a seed, matching the seed's resolved slot within the active
 * layer. Transparent is an ordinary slot here: a hole fills like any region.
 * A seed outside the canvas writes nothing and reports a clip.
 */
export function floodFill(
  canvas: SlotCanvas,
  seedX: number,
  seedY: number,
  slot: number,
  connectivity: 4 | 8,
  owner?: number,
): boolean {
  if (!canvas.inBounds(seedX, seedY)) {
    return true;
  }

  const { width, height } = canvas;
  const source = Int16Array.from(canvas.slots);
  const target = source[seedY * width + seedX] ?? TRANSPARENT_SLOT;
  if (target === slot) {
    // Rewriting a region with its own slot is a no-op, not an error.
    return false;
  }

  const visited = new Uint8Array(width * height);
  const stack: number[] = [seedY * width + seedX];
  visited[seedY * width + seedX] = 1;

  while (stack.length > 0) {
    const index = stack.pop();
    if (index === undefined || source[index] !== target) {
      continue;
    }
    const x = index % width;
    const y = (index - x) / width;
    canvas.set(x, y, slot, owner);

    const neighbours: Array<[number, number]> = [
      [x, y - 1],
      [x + 1, y],
      [x, y + 1],
      [x - 1, y],
    ];
    if (connectivity === 8) {
      neighbours.push([x - 1, y - 1], [x + 1, y - 1], [x + 1, y + 1], [x - 1, y + 1]);
    }
    for (const [nx, ny] of neighbours) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }
      const next = ny * width + nx;
      if (visited[next] === 1 || source[next] !== target) {
        continue;
      }
      visited[next] = 1;
      stack.push(next);
    }
  }

  return false;
}
