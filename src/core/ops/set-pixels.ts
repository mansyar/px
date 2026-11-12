import type { SlotCanvas } from '../canvas.js';
import { writePoints } from './write-points.js';

/** Paint an explicit coordinate list, clipping per pixel. */
export function drawSetPixels(
  canvas: SlotCanvas,
  points: ReadonlyArray<readonly [number, number]>,
  slot: number,
): boolean {
  return writePoints(canvas, points, slot);
}
