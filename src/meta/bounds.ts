/**
 * Trim geometry for export metadata. The trim box is the tightest rectangle
 * around painted pixels in the flattened canvas; export needs it, and so does
 * `validate`.
 */

import { TRANSPARENT_SLOT } from '../core/palette.js';

export interface TrimBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The zero box an empty canvas exports: no trim, no origin shift. */
export const EMPTY_TRIM: TrimBox = { x: 0, y: 0, w: 0, h: 0 };

/** Tightest rectangle around painted pixels, or null when nothing is painted. */
export function trimBounds(flattened: Int16Array, width: number, height: number): TrimBox | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (flattened[y * width + x] === TRANSPARENT_SLOT) {
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) {
    return null;
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
