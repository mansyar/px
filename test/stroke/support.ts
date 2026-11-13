/**
 * Shared reading of a rendered stroke. Everything here inspects the compiled
 * canvas, so a test cannot pass on geometry the recipe model rejected.
 */

import type { SlotCanvas } from '../../src/core/canvas.js';

export type Point = [number, number];

/** Every painted coordinate, in canvas order. */
export function paintedPoints(canvas: SlotCanvas): Point[] {
  const points: Point[] = [];
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (canvas.get(x, y) !== -1) {
        points.push([x, y]);
      }
    }
  }
  return points;
}

/** True when every painted pixel is reachable from the first by 8-way steps. */
export function isEightConnected(points: readonly Point[]): boolean {
  if (points.length === 0) {
    return true;
  }
  const seen = new Set(points.map(([x, y]) => `${x},${y}`));
  const start = points[0] as Point;
  const visited = new Set<string>([`${start[0]},${start[1]}`]);
  const queue: Point[] = [start];
  while (queue.length > 0) {
    const [x, y] = queue.pop() as Point;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) {
          continue;
        }
        const key = `${x + dx},${y + dy}`;
        if (seen.has(key) && !visited.has(key)) {
          visited.add(key);
          queue.push([x + dx, y + dy]);
        }
      }
    }
  }
  return visited.size === seen.size;
}

/** The painted y of each column; throws when a column holds more than one. */
export function columnHeights(canvas: SlotCanvas): number[] {
  const heights: number[] = [];
  for (let x = 0; x < canvas.width; x += 1) {
    let found = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      if (canvas.get(x, y) === -1) {
        continue;
      }
      if (found !== -1) {
        throw new Error(`column ${x} holds more than one painted pixel`);
      }
      found = y;
    }
    heights.push(found);
  }
  return heights;
}

/**
 * The x-distance between consecutive y increments. A straight shallow line is
 * a run of these; a regular cadence is a repeated value.
 */
export function incrementGaps(heights: readonly number[]): number[] {
  const increments: number[] = [];
  for (let x = 1; x < heights.length; x += 1) {
    if ((heights[x] as number) !== (heights[x - 1] as number)) {
      increments.push(x);
    }
  }
  const gaps: number[] = [];
  for (let index = 1; index < increments.length; index += 1) {
    gaps.push((increments[index] as number) - (increments[index - 1] as number));
  }
  return gaps;
}

/** Length of the longest run of one repeated value. */
export function longestEqualRun(values: readonly number[]): number {
  let best = 0;
  let run = 0;
  let previous: number | undefined;
  for (const value of values) {
    run = value === previous ? run + 1 : 1;
    previous = value;
    best = Math.max(best, run);
  }
  return best;
}
