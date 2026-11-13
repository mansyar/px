/**
 * `stroke` — a polyline path that cleans its own steps.
 *
 * Two rules, both documented here because both are behaviour, not implementation
 * detail:
 *
 * 1. **No L-turn double pixels.** Three consecutive pixels whose first and last
 *    are diagonal neighbours form an L. The corner pixel is dropped, which is
 *    the standard pixel-perfect cleanup: the two survivors are diagonal
 *    neighbours, so the path stays 8-connected and no gap opens. The path's
 *    first pixel is never dropped: on a closed path it is the seam the closing
 *    segment lands on, and a missing seam pixel is a hole, not a cleanup.
 *
 * 2. **No repeating step run.** A straight Bresenham line places its minority
 *    steps on a fixed rational cadence: a 2:1 diagonal is `2, 2, 2, ...`, which
 *    reads as a staircase at 1x. The segment rasteriser here places them on a
 *    golden-ratio (Sturmian) schedule instead — the k-th minority step sits at
 *    its ideal position shifted by `frac(k * ALPHA)` — so the gaps between
 *    minority steps never settle into a period. Positions are clamped strictly
 *    increasing and the last one is pinned to the segment's major-axis length,
 *    so the path is 8-connected, ends exactly on the endpoint, and stays within
 *    about a pixel of the true line.
 *
 * Both rules use only integer coordinates and IEEE-754-exact double arithmetic
 * on small integers, so the bytes are identical on every platform. There is no
 * entropy source and no transcendental function: `ALPHA` is a constant and the
 * schedule is a product and a fractional part.
 *
 * Width, smoothing and erase are the op's surface: `width: 2` adds one pixel
 * below a mostly-horizontal point and one to its right otherwise, `smooth`
 * chamfers interior vertices before rasterising, and `color: null` erases
 * through the shared writer (clearing ownership, like every erase op).
 */

import type { SlotCanvas } from '../canvas.js';
import { PxError } from '../errors.js';
import type { StrokeOp } from '../recipe/types.js';
import { type Point, writePoints } from './write-points.js';

/** Golden ratio conjugate, the classic low-discrepancy step. */
const ALPHA = 0.6180339887498949;

/** How far a smoothed vertex is cut back along each of its two segments. */
const SMOOTH_RADIUS = 2;

/** Total order the writer emits: the schedule is fixed, not random. */
function minoritySchedule(majorDelta: number, minorDelta: number): number[] {
  const positions: number[] = [];
  const spacing = majorDelta / minorDelta;
  // At 45 degrees every step moves both axes, so there is nothing to distribute.
  // The shift spans a full period: half a period leaves runs of six equal steps,
  // a full one keeps every run to two, at a worst-case deviation under a pixel.
  const spread = Math.min(1, spacing - 1) * 2;
  let previous = 0;
  for (let k = 1; k <= minorDelta; k += 1) {
    const ideal = k * spacing;
    // The phase is the whole rule: a fixed rational cadence repeats, this does not.
    const phase = (k * ALPHA) % 1;
    const target = Math.round(ideal + (phase - 0.5) * spread);
    // Keep one step per position and leave room for the remaining increments, so
    // the last position is the segment's length exactly.
    const latest = majorDelta - (minorDelta - k);
    positions.push(Math.min(latest, Math.max(previous + 1, target)));
    previous = positions[k - 1] ?? 0;
  }
  return positions;
}

/**
 * One segment, 8-connected, endpoint inclusive, with an aperiodic minority-step
 * cadence. `majorDelta` is the longer axis; the minor axis is incremented on the
 * scheduled steps only.
 */
export function balancedSegment(a: Point, b: Point): Point[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const alongX = Math.abs(dx) >= Math.abs(dy);
  const majorDelta = alongX ? Math.abs(dx) : Math.abs(dy);
  if (majorDelta === 0) {
    return [[a[0], a[1]]];
  }

  const minorDelta = alongX ? Math.abs(dy) : Math.abs(dx);
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const schedule = minorDelta === 0 ? [] : minoritySchedule(majorDelta, minorDelta);

  const points: Point[] = [];
  let major = 0;
  let minor = 0;
  let next = 0;
  for (let step = 0; step <= majorDelta; step += 1) {
    points.push(
      alongX
        ? [a[0] + stepX * major, a[1] + stepY * minor]
        : [a[0] + stepX * minor, a[1] + stepY * major],
    );
    if (step === majorDelta) {
      break;
    }
    major += 1;
    while (next < schedule.length && schedule[next] === step + 1) {
      minor += 1;
      next += 1;
    }
  }
  return points;
}

/** Two pixels that touch corner-to-corner. */
function diagonal(left: Point, right: Point): boolean {
  return Math.abs(left[0] - right[0]) === 1 && Math.abs(left[1] - right[1]) === 1;
}

function samePoint(left: Point, right: Point): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

/** Consecutive identical points collapsed; the seam of a closed path included. */
function dedupe(points: ReadonlyArray<Point>): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (last === undefined || !samePoint(last, point)) {
      out.push([point[0], point[1]]);
    }
  }
  return out;
}

/**
 * Rule 1: drop the corner of every L. A single left-to-right pass is enough
 * because dropping a corner leaves its neighbours diagonal, which is already
 * the cleanest form; re-running cannot remove more.
 */
export function pixelPerfect(points: ReadonlyArray<Point>): Point[] {
  const clean = dedupe(points);
  if (clean.length < 3) {
    return clean;
  }
  const out: Point[] = [clean[0] as Point];
  for (let index = 1; index < clean.length; index += 1) {
    const previous = out[out.length - 1] as Point;
    const next = clean[index + 1];
    if (next !== undefined && diagonal(previous, next)) {
      continue;
    }
    out.push(clean[index] as Point);
  }
  return out;
}

/** How far a vertex is cut back: never past the midpoint of its segment. */
function cutBack(from: Point, to: Point): Point {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.max(Math.abs(dx), Math.abs(dy));
  const take = Math.min(SMOOTH_RADIUS, Math.max(1, Math.floor(length / 2)));
  return [from[0] + Math.sign(dx) * take, from[1] + Math.sign(dy) * take];
}

/**
 * Rule for `smooth`: every vertex becomes an entry and an exit point cut back
 * along its two segments, and the chamfer between them is rasterised like any
 * other segment. Endpoints of an open path stay exact; a closed path's seam is
 * a vertex like any other.
 */
export function roundedPath(points: ReadonlyArray<Point>, closed: boolean): Point[] {
  const count = points.length;
  if (count < 3) {
    return points.map((point): Point => [point[0], point[1]]);
  }
  const out: Point[] = [];
  if (!closed) {
    out.push([(points[0] as Point)[0], (points[0] as Point)[1]]);
  }
  const first = closed ? 0 : 1;
  const last = closed ? count - 1 : count - 2;
  for (let index = first; index <= last; index += 1) {
    const previous = points[(index - 1 + count) % count] as Point;
    const current = points[index] as Point;
    const next = points[(index + 1) % count] as Point;
    out.push(cutBack(current, previous));
    out.push(cutBack(current, next));
  }
  if (!closed) {
    const end = points[count - 1] as Point;
    out.push([end[0], end[1]]);
  }
  return out;
}

/** Every segment rasterised and chained, sharing each joint pixel exactly once. */
function rasterise(points: ReadonlyArray<Point>, closed: boolean): Point[] {
  const out: Point[] = [];
  const joints: Array<[Point, Point]> = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    joints.push([points[index] as Point, points[index + 1] as Point]);
  }
  if (closed && points.length > 1) {
    joints.push([points[points.length - 1] as Point, points[0] as Point]);
  }
  for (const [a, b] of joints) {
    const segment = dedupe(balancedSegment(a, b));
    for (let index = out.length === 0 ? 0 : 1; index < segment.length; index += 1) {
      out.push(segment[index] as Point);
    }
  }
  return out;
}

/**
 * Rule for `width: 2`: one extra pixel per centreline pixel, below a
 * mostly-horizontal point and to the right otherwise. The side is fixed rather
 * than facing-dependent, so the width is deterministic and symmetric under
 * replay; overhang is clipped by the shared writer and warns once per op.
 */
function thicken(points: ReadonlyArray<Point>): Point[] {
  const out: Point[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index] as Point;
    const previous = points[index - 1] ?? current;
    const next = points[index + 1] ?? current;
    const dx = next[0] - previous[0];
    const dy = next[1] - previous[1];
    const offset: Point = Math.abs(dx) > Math.abs(dy) ? [0, 1] : [1, 0];
    out.push(current, [current[0] + offset[0], current[1] + offset[1]]);
  }
  return out;
}

export interface StrokeOptions {
  closed: boolean;
  smooth: boolean;
  width: 1 | 2;
}

/**
 * The whole path, in one deterministic pass: shape, rasterise, clean, widen.
 * A path that collapses to a single distinct point is `E_BAD_PATH`: a repeat is
 * deduplicated, but a stroke with no extent is not a stroke.
 */
export function strokePath(
  path: ReadonlyArray<Point>,
  options: StrokeOptions,
  site: { opIndex: number; layerId: string },
): Point[] {
  const points = dedupe(path);
  if (points.length < 2) {
    throw new PxError(
      'E_BAD_PATH',
      `Op ${site.opIndex} (stroke) in layer "${site.layerId}" has ${points.length} distinct point(s) after removing repeats; at least two are required`,
      'Pass path as [[x, y], ...] with at least two different coordinates.',
      { layer: site.layerId, op_index: site.opIndex },
    );
  }
  const shaped = options.smooth ? roundedPath(points, options.closed) : points;
  const raster = rasterise(shaped, options.closed);
  // The closing segment ends where the first one started; the ring owns that
  // pixel once, so the duplicate tail goes before the corner pass sees it.
  const first = raster[0];
  const last = raster[raster.length - 1];
  if (
    options.closed &&
    raster.length > 1 &&
    first !== undefined &&
    last !== undefined &&
    samePoint(first, last)
  ) {
    raster.pop();
  }
  // The first pixel is the seam anchor and survives the corner pass, so a
  // closed ring always lands on it (AC-6).
  const centre = pixelPerfect(raster);
  return options.width === 2 ? thicken(centre) : centre;
}

export function drawStroke(
  canvas: SlotCanvas,
  op: StrokeOp,
  slot: number,
  owner: number | undefined,
  site: { opIndex: number; layerId: string },
): boolean {
  const points = strokePath(
    op.path,
    {
      closed: op.closed === true,
      smooth: op.smooth === true,
      width: op.width === 2 ? 2 : 1,
    },
    site,
  );
  return writePoints(canvas, points, slot, owner);
}
