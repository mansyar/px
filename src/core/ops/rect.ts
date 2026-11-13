import type { SlotCanvas } from '../canvas.js';

/**
 * Filled rectangle. `w` and `h` count pixels, so the far edge is included:
 * rect(0, 0, 2, 2) covers (0, 0), (1, 0), (0, 1), (1, 1).
 *
 * `owner` is the part index the pixels belong to; omitted leaves ownership as
 * it was, which only the colour-remapping passes do.
 */
export function drawRect(
  canvas: SlotCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  slot: number,
  owner?: number,
): boolean {
  let clipped = false;
  for (let row = 0; row < h; row += 1) {
    for (let column = 0; column < w; column += 1) {
      if (!canvas.set(x + column, y + row, slot, owner)) {
        clipped = true;
      }
    }
  }
  return clipped;
}
