/**
 * `ORPHAN_PIXEL`.
 *
 * A painted pixel with no painted neighbour nearby reads as noise: it cannot be
 * part of a silhouette, a line, or a dithered fill. The search reaches
 * `ORPHAN_NEIGHBOUR_RADIUS` in every direction, so everything the engine draws
 * stays clean — a 1-px diagonal `line`, a checkerboard `dither_fill`, and the
 * quarter-coverage `bayer_25` lattice, whose lit cells are two pixels apart.
 * Only a pixel with nothing painted inside that radius is flagged.
 */

import { TRANSPARENT_SLOT } from '../core/palette.js';
import { FindingCollector } from './collector.js';
import { ORPHAN_NEIGHBOUR_RADIUS } from './thresholds.js';
import type { LintContext, LintRule } from './types.js';

function painted(context: LintContext, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= context.width || y >= context.height) {
    return false;
  }
  return context.flattened[y * context.width + x] !== TRANSPARENT_SLOT;
}

function hasNeighbour(context: LintContext, x: number, y: number): boolean {
  for (let dy = -ORPHAN_NEIGHBOUR_RADIUS; dy <= ORPHAN_NEIGHBOUR_RADIUS; dy += 1) {
    for (let dx = -ORPHAN_NEIGHBOUR_RADIUS; dx <= ORPHAN_NEIGHBOUR_RADIUS; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      if (painted(context, x + dx, y + dy)) {
        return true;
      }
    }
  }
  return false;
}

export const orphanPixelRule: LintRule = {
  code: 'ORPHAN_PIXEL',
  severity: 'warning',
  evaluate(context) {
    const collector = new FindingCollector('ORPHAN_PIXEL', 'warning');
    for (let y = 0; y < context.height; y += 1) {
      for (let x = 0; x < context.width; x += 1) {
        if (!painted(context, x, y) || hasNeighbour(context, x, y)) {
          continue;
        }
        collector.add({
          message: `Pixel (${x}, ${y}) is isolated: no painted neighbour within ${ORPHAN_NEIGHBOUR_RADIUS} px`,
          coord: [x, y],
        });
      }
    }
    return collector.finish();
  },
};
