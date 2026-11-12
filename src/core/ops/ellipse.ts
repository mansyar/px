/**
 * Integer midpoint ellipse.
 *
 * The ellipse is sampled at pixel centres, expressed in doubled coordinates:
 * pixel `x` has centre `2x + 1` and the bounding box centre is `w`. That makes
 * every comparison an exact integer and gives the classic parity behaviour —
 * an odd diameter has one centre row and column, an even diameter has two.
 *
 * Because the sampled region is row-convex, each row needs one exact integer
 * square root rather than a decision variable that walks the boundary. The
 * result is the midpoint ellipse boundary; the goldens and unit tests pin it so
 * a later "fix" cannot move the curve by half a pixel.
 */

import type { SlotCanvas } from '../canvas.js';

/** Exact integer square root of a non-negative integer. */
function isqrt(value: number): number {
  if (value <= 0) {
    return 0;
  }
  let root = Math.floor(Math.sqrt(value));
  while (root > 0 && root * root > value) {
    root -= 1;
  }
  while ((root + 1) * (root + 1) <= value) {
    root += 1;
  }
  return root;
}

/**
 * Half-open horizontal span of one row, in local coordinates. `lo > hi` means
 * the row is inside the bounding box but outside the ellipse, which happens for
 * a tall thin ellipse whose top rows miss every pixel centre.
 */
export function ellipseRowSpan(row: number, w: number, h: number): [number, number] {
  // Offset of this row's centre from the box centre, doubled.
  const offset = 2 * row + 1 - h;
  const scaled = w * w * (h * h - offset * offset);
  const denominator = h * h;
  const half = isqrt(Math.floor(scaled / denominator));
  const lo = Math.max(0, Math.floor((w - half) / 2));
  const hi = Math.min(w - 1, Math.floor((w + half - 1) / 2));
  return [lo, hi];
}

export function ellipseSpans(w: number, h: number): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (let row = 0; row < h; row += 1) {
    spans.push(ellipseRowSpan(row, w, h));
  }
  return spans;
}

/**
 * Draw an ellipse inside `x, y, w, h`. Without `fill`, only the boundary is
 * painted: a pixel is on the boundary when it sits at a row's span end or when
 * its row neighbour's span does not cover it. Filled mode paints the same spans
 * in one pass, so outline and fill agree and no pixel is written twice.
 */
export function drawEllipse(
  canvas: SlotCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  slot: number,
  fill = false,
): boolean {
  const spans = ellipseSpans(w, h);
  let clipped = false;

  for (let row = 0; row < h; row += 1) {
    const span = spans[row];
    if (span === undefined) {
      continue;
    }
    const [lo, hi] = span;
    if (lo > hi) {
      continue;
    }
    const above = spans[row - 1];
    const below = spans[row + 1];
    for (let column = lo; column <= hi; column += 1) {
      if (!fill && !onBoundary(column, lo, hi, above, below)) {
        continue;
      }
      if (!canvas.set(x + column, y + row, slot)) {
        clipped = true;
      }
    }
  }

  return clipped;
}

function onBoundary(
  column: number,
  lo: number,
  hi: number,
  above: [number, number] | undefined,
  below: [number, number] | undefined,
): boolean {
  if (column === lo || column === hi) {
    return true;
  }
  if (above === undefined || below === undefined) {
    return true;
  }
  return column < above[0] || column > above[1] || column < below[0] || column > below[1];
}
