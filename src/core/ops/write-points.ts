/**
 * Shared point writer. Every geometry op funnels its pixels through here so
 * clipping has exactly one definition.
 */

import type { SlotCanvas } from '../canvas.js';

export type Point = [number, number];

/** Returns true when at least one coordinate fell outside the canvas. */
export function writePoints(
  canvas: SlotCanvas,
  points: ReadonlyArray<readonly [number, number]>,
  slot: number,
): boolean {
  let clipped = false;
  for (const [x, y] of points) {
    if (!canvas.set(x, y, slot)) {
      clipped = true;
    }
  }
  return clipped;
}
