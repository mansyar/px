/**
 * Mirror the active layer.
 *
 * The mapping is `x' = 2 * pivot - x`. A half-integer pivot lands on integers,
 * so an even-width reflection has no fixed column; an integer pivot does, and
 * that column is a one-pixel seam. Everything is computed from a snapshot taken
 * before the first write, so a mirrored pixel is never itself mirrored and a
 * destination is written exactly once. The seam pixel is skipped because it is
 * already its own image — writing it would be the "twice" the rule forbids.
 */

import type { SlotCanvas } from '../canvas.js';
import { TRANSPARENT_SLOT } from '../palette.js';

/**
 * The reflection is of opaque pixels only: transparent source pixels write
 * nothing, so mirroring a drawn half into an empty half completes the sprite
 * instead of erasing the half that was already there.
 */
export function drawMirror(canvas: SlotCanvas, axis: 'x' | 'y', pivot: number): boolean {
  const source = Int16Array.from(canvas.slots);
  const { width, height } = canvas;
  // 2 * pivot; integral for both integer and half-integer pivots.
  const doubled = Math.round(pivot * 2);
  let clipped = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const slot = source[y * width + x];
      if (slot === undefined || slot === TRANSPARENT_SLOT) {
        continue;
      }
      const targetX = axis === 'x' ? doubled - x : x;
      const targetY = axis === 'y' ? doubled - y : y;
      if (targetX === x && targetY === y) {
        continue;
      }
      if (!canvas.set(targetX, targetY, slot)) {
        clipped = true;
      }
    }
  }

  return clipped;
}
