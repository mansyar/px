/**
 * `JAGGY_LINE`.
 *
 * Walks the silhouette one row and one column at a time. A clean 1px diagonal
 * moves by one pixel per row; a hand-drawn one moves in uneven bursts (2, then
 * 1, then 3), which is what a jaggy looks like when someone freehands a line.
 * Only monotone, one-pixel steps are considered, and only `info` is reported:
 * a curve legitimately needs uneven steps, so the threshold is a tuning target.
 */

import { TRANSPARENT_SLOT } from '../core/palette.js';
import { FindingCollector } from './collector.js';
import { JAGGY_MIN_RUNS, MAX_COORDS_PER_FINDING } from './thresholds.js';
import type { LintContext, LintCoord, LintRule } from './types.js';

interface EdgePoint {
  /** Row or column index the edge pixel sits in. */
  line: number;
  /** Column (for rows) or row (for columns) of the edge pixel. */
  value: number;
}

interface Run {
  value: number;
  firstLine: number;
  lastLine: number;
}

export interface JaggySegment {
  startLine: number;
  endLine: number;
  /** Length in lines of each consecutive equal-value run, in order. */
  steps: number[];
  /** Edge coordinate per line of the segment, in line order. */
  values: number[];
}

export type EdgeSide = 'near' | 'far';

export type EdgeAxis = 'row' | 'column';

/**
 * Split a sequence into monotone staircase segments and return the ones whose
 * step lengths differ. A segment needs `JAGGY_MIN_RUNS` runs before its steps
 * form a sequence worth reporting.
 */
export function jaggySegments(sequence: readonly (EdgePoint | null)[]): JaggySegment[] {
  const segments: JaggySegment[] = [];
  let runs: Run[] = [];
  let direction = 0;

  function flush(): void {
    const first = runs[0];
    const last = runs[runs.length - 1];
    if (runs.length >= JAGGY_MIN_RUNS && first !== undefined && last !== undefined) {
      const steps = runs.map((run) => run.lastLine - run.firstLine + 1);
      const step = steps[0];
      if (step !== undefined && steps.some((entry) => entry !== step)) {
        const values: number[] = [];
        for (const run of runs) {
          for (let line = run.firstLine; line <= run.lastLine; line += 1) {
            values.push(run.value);
          }
        }
        segments.push({ startLine: first.firstLine, endLine: last.lastLine, steps, values });
      }
    }
    runs = [];
    direction = 0;
  }

  for (const point of sequence) {
    if (point === null) {
      flush();
      continue;
    }
    const previous = runs[runs.length - 1];
    if (previous === undefined) {
      runs.push({ value: point.value, firstLine: point.line, lastLine: point.line });
      continue;
    }
    const delta = point.value - previous.value;
    if (Math.abs(delta) > 1 || (delta !== 0 && direction !== 0 && delta !== direction)) {
      flush();
      runs.push({ value: point.value, firstLine: point.line, lastLine: point.line });
      continue;
    }
    if (delta === 0) {
      previous.lastLine = point.line;
      continue;
    }
    direction = delta;
    runs.push({ value: point.value, firstLine: point.line, lastLine: point.line });
  }
  flush();
  return segments;
}

/** Near or far painted index of every row; null for a row with no pixels. */
function rowEdges(context: LintContext, side: EdgeSide): Array<EdgePoint | null> {
  const { width, height, flattened } = context;
  const edges: Array<EdgePoint | null> = [];
  for (let y = 0; y < height; y += 1) {
    let near = -1;
    let far = -1;
    for (let x = 0; x < width; x += 1) {
      if (flattened[y * width + x] === TRANSPARENT_SLOT) {
        continue;
      }
      if (near < 0) {
        near = x;
      }
      far = x;
    }
    edges.push(near < 0 ? null : { line: y, value: side === 'near' ? near : far });
  }
  return edges;
}

/** Near or far painted index of every column; null for a column with no pixels. */
function columnEdges(context: LintContext, side: EdgeSide): Array<EdgePoint | null> {
  const { width, height, flattened } = context;
  const edges: Array<EdgePoint | null> = [];
  for (let x = 0; x < width; x += 1) {
    let near = -1;
    let far = -1;
    for (let y = 0; y < height; y += 1) {
      if (flattened[y * width + x] === TRANSPARENT_SLOT) {
        continue;
      }
      if (near < 0) {
        near = y;
      }
      far = y;
    }
    edges.push(near < 0 ? null : { line: x, value: side === 'near' ? near : far });
  }
  return edges;
}

interface EdgeScan {
  label: string;
  axis: EdgeAxis;
  side: EdgeSide;
}

const EDGE_SCANS: readonly EdgeScan[] = [
  { label: 'left', axis: 'row', side: 'near' },
  { label: 'right', axis: 'row', side: 'far' },
  { label: 'top', axis: 'column', side: 'near' },
  { label: 'bottom', axis: 'column', side: 'far' },
];

export const jaggyLineRule: LintRule = {
  code: 'JAGGY_LINE',
  severity: 'info',
  evaluate(context) {
    const collector = new FindingCollector('JAGGY_LINE', 'info');
    for (const scan of EDGE_SCANS) {
      const sequence =
        scan.axis === 'row' ? rowEdges(context, scan.side) : columnEdges(context, scan.side);
      for (const segment of jaggySegments(sequence)) {
        const coords: LintCoord[] = [];
        for (let index = 0; index < segment.values.length; index += 1) {
          if (coords.length >= MAX_COORDS_PER_FINDING) {
            break;
          }
          const value = segment.values[index];
          const line = segment.startLine + index;
          coords.push(scan.axis === 'row' ? [value, line] : [line, value]);
        }
        const unit = scan.axis === 'row' ? 'rows' : 'columns';
        collector.add({
          message: `${scan.label} edge of ${unit} ${segment.startLine}-${segment.endLine} steps ${segment.steps.join(',')}; a 1px diagonal repeats one step length`,
          coords,
        });
      }
    }
    return collector.finish();
  },
};
