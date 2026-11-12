/**
 * `replace_slot`: rewrite one slot to another inside the active layer.
 *
 * Exact slot identity only — no family wildcard. The source read is a snapshot,
 * so a swap (`from` and `to` both present) does not chase its own tail.
 */

import type { SlotCanvas } from '../canvas.js';

/** Returns how many pixels were rewritten. */
export function replaceSlot(
  canvas: SlotCanvas,
  source: Int16Array,
  from: number,
  to: number,
): number {
  if (from === to) {
    return 0;
  }
  const { width, height } = canvas;
  let replaced = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (source[y * width + x] !== from) {
        continue;
      }
      canvas.set(x, y, to);
      replaced += 1;
    }
  }
  return replaced;
}
