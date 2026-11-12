/**
 * Op dispatch. The switch is exhaustive: adding an op to the union without
 * wiring it here is a type error.
 */

import type { SlotCanvas } from '../canvas.js';
import type { Op } from '../recipe/types.js';
import { drawLine } from './line.js';
import { drawRect } from './rect.js';
import { drawSetPixels } from './set-pixels.js';

export { bresenham, removeCorners } from './line.js';
export { drawRect } from './rect.js';
export { drawSetPixels } from './set-pixels.js';
export { writePoints } from './write-points.js';

/** Returns true when the op wrote at least one pixel outside the canvas. */
export function applyOp(canvas: SlotCanvas, op: Op, slot: number): boolean {
  switch (op.op) {
    case 'set_pixels':
      return drawSetPixels(canvas, op.points, slot);
    case 'rect':
      return drawRect(canvas, op.x, op.y, op.w, op.h, slot);
    case 'line':
      return drawLine(canvas, op.x1, op.y1, op.x2, op.y2, slot, op.pixelPerfect === true);
  }
}
