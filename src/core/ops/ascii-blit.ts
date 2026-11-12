/**
 * ASCII stamp. The legend is resolved to slot indices once, by the caller, so
 * the blit itself is a character lookup and a clipped write per cell. `.` is
 * transparent unless the legend claims it, which is why a missing map entry
 * below means "write nothing" rather than an error: the parser already rejected
 * every uncovered glyph.
 */

import type { SlotCanvas } from '../canvas.js';

export function drawAsciiBlit(
  canvas: SlotCanvas,
  x: number,
  y: number,
  grid: readonly string[],
  cells: ReadonlyMap<string, number>,
): boolean {
  let clipped = false;
  grid.forEach((row, rowIndex) => {
    Array.from(row).forEach((glyph, columnIndex) => {
      const slot = cells.get(glyph);
      if (slot === undefined) {
        return;
      }
      if (!canvas.set(x + columnIndex, y + rowIndex, slot)) {
        clipped = true;
      }
    });
  });
  return clipped;
}
