/**
 * `ORPHAN_PIXEL`.
 *
 * A painted pixel with no 4-way painted neighbour reads as noise: it cannot be
 * part of a silhouette, a line, or a dithered fill. Diagonal neighbours do not
 * count, which is what makes the rule find single stray pixels.
 */

import { TRANSPARENT_SLOT } from '../core/palette.js';
import { FindingCollector } from './collector.js';
import type { LintContext, LintRule } from './types.js';

function painted(context: LintContext, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= context.width || y >= context.height) {
    return false;
  }
  return context.flattened[y * context.width + x] !== TRANSPARENT_SLOT;
}

function hasNeighbour(context: LintContext, x: number, y: number): boolean {
  return (
    painted(context, x - 1, y) ||
    painted(context, x + 1, y) ||
    painted(context, x, y - 1) ||
    painted(context, x, y + 1)
  );
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
          message: `Pixel (${x}, ${y}) is isolated: no 4-way painted neighbour`,
          coord: [x, y],
        });
      }
    }
    return collector.finish();
  },
};
