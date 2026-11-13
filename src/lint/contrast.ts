/**
 * `LOW_CONTRAST`.
 *
 * Silhouette edge pixels are the ones that carry the shape. If an edge pixel is
 * within the profile's `lowContrastMinRatio` of the preview backdrop it
 * disappears there, and the sprite reads as a different silhouette. One finding
 * reports the share, because the fix is a palette decision rather than fifty
 * separate pixel edits.
 *
 * The floor is looser as the canvas grows: a 128 px sheet has interior detail to
 * separate its mid tones, while a 16 px sprite has two or three tones total and
 * needs every edge to carry weight.
 */

import { type Rgba, TRANSPARENT_SLOT } from '../core/palette.js';
import { FindingCollector } from './collector.js';
import { lintNumbers } from './context.js';
import {
  DEFAULT_BACKDROP_HEX,
  LOW_CONTRAST_BACKDROP,
  MAX_COORDS_PER_FINDING,
} from './thresholds.js';
import type { LintContext, LintCoord, LintRule } from './types.js';

function linearChannel(value: number): number {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 for black and 1 for white. */
export function relativeLuminance(color: Rgba): number {
  return (
    0.2126 * linearChannel(color.r) +
    0.7152 * linearChannel(color.g) +
    0.0722 * linearChannel(color.b)
  );
}

/** WCAG contrast ratio: 1:1 for two identical colours, 21:1 for black on white. */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function isPainted(context: LintContext, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= context.width || y >= context.height) {
    return false;
  }
  return context.flattened[y * context.width + x] !== TRANSPARENT_SLOT;
}

/** A painted pixel with a transparent or off-canvas 4-way neighbour. */
function isEdge(context: LintContext, x: number, y: number): boolean {
  return (
    !isPainted(context, x - 1, y) ||
    !isPainted(context, x + 1, y) ||
    !isPainted(context, x, y - 1) ||
    !isPainted(context, x, y + 1)
  );
}

export const lowContrastRule: LintRule = {
  code: 'LOW_CONTRAST',
  severity: 'warning',
  evaluate(context) {
    const collector = new FindingCollector('LOW_CONTRAST', 'warning');
    const floor = lintNumbers(context).lowContrastMinRatio;
    const quoted: LintCoord[] = [];
    let edgeCount = 0;
    let affected = 0;

    for (let y = 0; y < context.height; y += 1) {
      for (let x = 0; x < context.width; x += 1) {
        const slot = context.flattened[y * context.width + x];
        if (slot === TRANSPARENT_SLOT || !isEdge(context, x, y)) {
          continue;
        }
        edgeCount += 1;
        const color = context.slots.rgba[slot];
        if (color === undefined) {
          continue;
        }
        if (contrastRatio(color, LOW_CONTRAST_BACKDROP) >= floor) {
          continue;
        }
        affected += 1;
        if (quoted.length < MAX_COORDS_PER_FINDING) {
          quoted.push([x, y]);
        }
      }
    }

    if (affected > 0) {
      const share = Math.round((affected / edgeCount) * 100);
      const cap = quoted.length < affected ? `; first ${quoted.length} coordinates quoted` : '';
      collector.add({
        message: `${affected} of ${edgeCount} edge pixels (${share}%) sit below ${floor}:1 contrast against ${DEFAULT_BACKDROP_HEX}${cap}`,
        coords: quoted,
      });
    }
    return collector.finish();
  },
};
