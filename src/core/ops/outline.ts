/**
 * `auto_outline`: a one-pixel border derived from the read source.
 *
 * `outer` writes transparent pixels that touch an opaque one; `inner` overwrites
 * opaque pixels that touch transparent. Neighbours are scanned in a fixed order
 * (N, E, S, W, then the diagonals) so the selective colour is deterministic when
 * two families meet at a corner.
 *
 * With `selective`, an outer pixel takes the family `outline` role of the first
 * opaque neighbour; an inner pixel takes its own family's, because its neighbour
 * is transparent and has no family. A family without an outline role falls back
 * to the explicit colour, and is left alone when there is none.
 */

import type { SlotCanvas } from '../canvas.js';
import { roleSlot, type SlotRoles, TRANSPARENT_SLOT } from '../palette.js';
import type { OutlineMode, OutlineWhere } from '../recipe/types.js';

type Offset = readonly [number, number];

const NEIGHBOURS_4: readonly Offset[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

const NEIGHBOURS_8: readonly Offset[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

export interface OutlineOptions {
  mode: OutlineMode;
  where: OutlineWhere;
  selective: boolean;
  /** Resolved slot, or undefined when the op supplied no colour. */
  color: number | undefined;
}

/** Returns how many pixels changed; zero means the pass was a no-op. */
export function autoOutline(
  canvas: SlotCanvas,
  source: Int16Array,
  roles: SlotRoles,
  options: OutlineOptions,
): number {
  const { width, height } = canvas;
  const neighbours = options.mode === '8-way' ? NEIGHBOURS_8 : NEIGHBOURS_4;
  const outer = options.where === 'outer';
  let painted = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const here = source[y * width + x] ?? TRANSPARENT_SLOT;
      // outer works on transparent pixels, inner on opaque ones.
      if (outer === (here !== TRANSPARENT_SLOT)) {
        continue;
      }

      let write: number | undefined;
      for (const [dx, dy] of neighbours) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          continue;
        }
        const neighbour = source[ny * width + nx] ?? TRANSPARENT_SLOT;
        if (outer) {
          if (neighbour === TRANSPARENT_SLOT) {
            continue;
          }
          write = options.selective
            ? (roleSlot(roles, neighbour, 'outline') ?? options.color)
            : options.color;
        } else {
          if (neighbour !== TRANSPARENT_SLOT) {
            continue;
          }
          write = options.selective
            ? (roleSlot(roles, here, 'outline') ?? options.color)
            : options.color;
        }
        break;
      }

      if (write === undefined) {
        continue;
      }
      canvas.set(x, y, write);
      painted += 1;
    }
  }

  return painted;
}
