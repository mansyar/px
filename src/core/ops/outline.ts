/**
 * `auto_outline`: a border derived from the read source, `thickness` pixels deep.
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
 *
 * Beyond the first ring the pass reads its own writes: each further ring copies
 * the colour and owner of the ring that reached it, so a thick border is one
 * colour deep rather than a stack of independently resolved pixels.
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
  /** How many pixels deep the border runs; the caller resolves the default. */
  thickness: number;
}

/** Returns how many pixels changed; zero means the pass was a no-op. */
export function autoOutline(
  canvas: SlotCanvas,
  source: Int16Array,
  roles: SlotRoles,
  options: OutlineOptions,
  sourceOwners?: Int16Array,
): number {
  const { width, height } = canvas;
  const neighbours = options.mode === '8-way' ? NEIGHBOURS_8 : NEIGHBOURS_4;
  const outer = options.where === 'outer';
  const rings = Math.max(1, Math.trunc(options.thickness));
  // Working copies, so ring two sees ring one. `filled` marks the pixels this
  // pass has already resolved, which is what an inner ring advances from.
  const work = Int16Array.from(source);
  const workOwners = sourceOwners === undefined ? undefined : Int16Array.from(sourceOwners);
  const filled = new Uint8Array(width * height);
  let painted = 0;

  for (let ring = 0; ring < rings; ring += 1) {
    // Each ring reads the state the previous ring left, never its own writes:
    // otherwise a pixel written this ring would seed the next one immediately
    // and the border would flood the canvas.
    const before = Int16Array.from(work);
    const beforeOwners = workOwners === undefined ? undefined : Int16Array.from(workOwners);
    const beforeFilled = Uint8Array.from(filled);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (beforeFilled[index] === 1) {
          continue;
        }
        const here = before[index] ?? TRANSPARENT_SLOT;
        // outer works on transparent pixels, inner on opaque ones.
        if (outer === (here !== TRANSPARENT_SLOT)) {
          continue;
        }

        let write: number | undefined;
        let owner: number | undefined;
        for (const [dx, dy] of neighbours) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }
          const neighbourIndex = ny * width + nx;
          const neighbour = before[neighbourIndex] ?? TRANSPARENT_SLOT;
          if (outer) {
            if (neighbour === TRANSPARENT_SLOT) {
              continue;
            }
            write =
              ring === 0
                ? options.selective
                  ? (roleSlot(roles, neighbour, 'outline') ?? options.color)
                  : options.color
                : neighbour;
            // The border belongs to the part it was drawn around.
            owner = beforeOwners?.[neighbourIndex];
          } else {
            const adjacent =
              ring === 0 ? neighbour === TRANSPARENT_SLOT : beforeFilled[neighbourIndex] === 1;
            if (!adjacent) {
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
        // An inner outline recolours an owned pixel, so it keeps that ownership;
        // an outer one claims the pixel for the part it borders.
        if (outer) {
          canvas.set(x, y, write, owner);
          if (workOwners !== undefined && owner !== undefined) {
            workOwners[index] = owner;
          }
        } else {
          canvas.set(x, y, write);
        }
        work[index] = write;
        filled[index] = 1;
        painted += 1;
      }
    }
  }

  return painted;
}
