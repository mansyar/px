/**
 * Pixel comparison for `px diff`. The render and the file being compared are
 * both plain RGBA buffers, so a diff is a byte walk, not an image library. The
 * owner buffer is the flattened one: a changed pixel belongs to whichever part
 * last painted it, which is the same rule every other part question follows.
 */

import { UNOWNED } from './canvas.js';

export interface DiffBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RgbaDiff {
  /** Changed pixels, or null when no per-pixel data was available. */
  count: number | null;
  /** Bounding box of the changed pixels, or null when nothing changed. */
  bounds: DiffBounds | null;
  /** Changed pixel count per declared part index, plus `unowned`. */
  byOwner: Map<number, number>;
  unowned: number;
}

/**
 * Compares two same-sized RGBA buffers. Callers check the sizes first: this
 * walks the shorter buffer if they disagree, so a size mismatch is an error the
 * CLI reports, never a silently truncated diff.
 */
export function diffRgba(
  width: number,
  height: number,
  current: Uint8Array,
  other: Uint8Array,
  owners: Int16Array | null,
): RgbaDiff {
  const byOwner = new Map<number, number>();
  let count = 0;
  let unowned = 0;
  let minX = 0;
  let minY = 0;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (
        current[offset] === other[offset] &&
        current[offset + 1] === other[offset + 1] &&
        current[offset + 2] === other[offset + 2] &&
        current[offset + 3] === other[offset + 3]
      ) {
        continue;
      }
      count += 1;
      if (maxX < 0) {
        minX = x;
        minY = y;
        maxX = x;
        maxY = y;
      } else {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      const owner = owners === null ? UNOWNED : (owners[y * width + x] ?? UNOWNED);
      if (owner === UNOWNED) {
        unowned += 1;
      } else {
        byOwner.set(owner, (byOwner.get(owner) ?? 0) + 1);
      }
    }
  }
  return {
    count,
    bounds: maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    byOwner,
    unowned,
  };
}
