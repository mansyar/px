/**
 * `JAGGY_LINE`.
 *
 * Walks the silhouette one row and one column at a time. A clean 1px diagonal
 * moves by one pixel per row; a hand-drawn one leaves that line and comes back,
 * which is what a jaggy looks like when someone freehands a line.
 *
 * The walk only reports a *kink*: one run whose length jumps away from two
 * neighbouring runs that agree with each other. That is what separates a jaggy
 * from the things a silhouette legitimately does:
 *
 * - a straight edge is a long run, cut at the profile's `jaggyMaxRun`;
 * - a chamfer meeting a straight side is a slope change that stays changed;
 * - a curve changes slope by one line at a time, never back and forth.
 *
 * Only `info` is reported: the geometry is still a judgement call.
 */

import { TRANSPARENT_SLOT } from '../core/palette.js';
import { PROFILES, type ProfileNumbers } from '../core/profile.js';
import { FindingCollector } from './collector.js';
import { lintNumbers } from './context.js';
import { MAX_COORDS_PER_FINDING } from './thresholds.js';
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

/** Run lengths of a group, in order. */
function stepLengths(runs: readonly Run[]): number[] {
  return runs.map((run) => run.lastLine - run.firstLine + 1);
}

/**
 * True when some run leaves two agreeing neighbours for at least `jump` lines.
 * The neighbours must agree within the same constant, because a run between a 1
 * and a 3 is the edge changing slope, not wobbling.
 */
export function hasKink(steps: readonly number[], jump = PROFILES.small.jaggyStepJump): boolean {
  for (let index = 1; index + 1 < steps.length; index += 1) {
    const left = steps[index - 1];
    const here = steps[index];
    const right = steps[index + 1];
    if (left === undefined || here === undefined || right === undefined) {
      continue;
    }
    if (Math.abs(left - right) >= jump) {
      continue;
    }
    if (Math.abs(here - left) >= jump || Math.abs(here - right) >= jump) {
      return true;
    }
  }
  return false;
}

/**
 * Split a sequence into monotone staircase segments and return the ones with a
 * kink. A run longer than the profile's `jaggyMaxRun` is a straight edge: it ends
 * the staircase instead of joining it, so a chamfer that meets a vertical side is
 * two clean pieces. A group needs `jaggyMinRuns` runs before it is considered.
 *
 * The numbers default to the `small` row, which is what the standalone callers
 * (and the fixtures in `docs/lint-thresholds.md`) were calibrated against; the
 * rule itself always passes the context's row.
 */
export function jaggySegments(
  sequence: readonly (EdgePoint | null)[],
  numbers: ProfileNumbers = PROFILES.small,
): JaggySegment[] {
  const segments: JaggySegment[] = [];
  let runs: Run[] = [];
  let direction = 0;

  function report(group: readonly Run[]): void {
    if (group.length < numbers.jaggyMinRuns) {
      return;
    }
    const steps = stepLengths(group);
    if (!hasKink(steps, numbers.jaggyStepJump)) {
      return;
    }
    const first = group[0];
    const last = group[group.length - 1];
    if (first === undefined || last === undefined) {
      return;
    }
    const values: number[] = [];
    for (const run of group) {
      for (let line = run.firstLine; line <= run.lastLine; line += 1) {
        values.push(run.value);
      }
    }
    segments.push({ startLine: first.firstLine, endLine: last.lastLine, steps, values });
  }

  function flush(): void {
    let group: Run[] = [];
    for (const run of runs) {
      if (run.lastLine - run.firstLine + 1 > numbers.jaggyMaxRun) {
        report(group);
        group = [];
        continue;
      }
      group.push(run);
    }
    report(group);
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
    const numbers = lintNumbers(context);
    for (const scan of EDGE_SCANS) {
      const sequence =
        scan.axis === 'row' ? rowEdges(context, scan.side) : columnEdges(context, scan.side);
      for (const segment of jaggySegments(sequence, numbers)) {
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
          message: `${scan.label} edge of ${unit} ${segment.startLine}-${segment.endLine} steps ${segment.steps.join(',')}; a clean line changes slope and stays, a jaggy leaves it and returns`,
          coords,
        });
      }
    }
    return collector.finish();
  },
};
