/**
 * Performance proof (NFR-3, NFR-7).
 *
 * A 256x256 canvas with 2,000 ops, compiled and encoded to PNG in-process, in
 * under 250 ms. Five runs after one warm-up, asserted on the median: a single
 * sample on a shared CI runner measures the runner, not the engine.
 *
 * No fake clocks, no sleeps, no mocked timing. `performance.now()` is the
 * monotonic clock the runtime gives us.
 */

import { describe, expect, it } from 'vitest';
import type { Op, Recipe, SlotRef } from '../../src/core/recipe/types.js';
import { renderRecipe } from '../../src/render/render.js';

const SIZE = 256;
const OP_COUNT = 2000;
const BUDGET_MS = 250;
const RUNS = 5;
const COLOURS = [
  '#1a1c2c',
  '#5d275d',
  '#b13e53',
  '#ef7d57',
  '#ffcd75',
  '#a7f070',
  '#38b764',
  '#257179',
];

/** Deterministic coordinates: no RNG in the engine, none in the proof. */
function coordinates(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function buildOps(): Op[] {
  const next = coordinates(0x5eed);
  const ops: Op[] = [];
  for (let index = 0; index < OP_COUNT; index += 1) {
    const x = Math.floor(next() * (SIZE - 16));
    const y = Math.floor(next() * (SIZE - 16));
    const color: SlotRef = `main.${index % COLOURS.length}`;
    switch (index % 4) {
      case 0:
        ops.push({ op: 'rect', x, y, w: 4, h: 4, color });
        break;
      case 1:
        ops.push({ op: 'line', x1: x, y1: y, x2: x + 8, y2: y + 3, color });
        break;
      case 2:
        ops.push({ op: 'ellipse', x, y, w: 6, h: 6, color });
        break;
      default:
        ops.push({
          op: 'set_pixels',
          points: [
            [x, y],
            [x + 2, y + 2],
          ],
          color,
        });
        break;
    }
  }
  return ops;
}

const recipe: Recipe = {
  version: 1,
  meta: { name: 'perf', width: SIZE, height: SIZE, alphaMode: 'binary' },
  palette: { main: { colors: COLOURS } },
  anchors: { origin: [0, 0] },
  layers: [{ id: 'base', ops: buildOps() }],
};

describe('2000 ops on a 256x256 canvas', () => {
  it('renders to PNG in under 250 ms, measured on the median of five runs', () => {
    const warm = renderRecipe(recipe);
    expect(warm.png.length, 'the warm-up render must produce a PNG').toBeGreaterThan(0);
    expect(
      warm.compiled.flattened.some((slot) => slot >= 0),
      'something must be painted',
    ).toBe(true);

    const samples: number[] = [];
    for (let run = 0; run < RUNS; run += 1) {
      const started = performance.now();
      const output = renderRecipe(recipe);
      samples.push(performance.now() - started);
      expect([output.png[0], output.png[1], output.png[2], output.png[3]], 'PNG signature').toEqual(
        [0x89, 0x50, 0x4e, 0x47],
      );
    }

    const sorted = [...samples].sort((left, right) => left - right);
    const median = sorted[Math.floor(RUNS / 2)];
    expect(median).toBeDefined();
    console.log(
      `perf: ${OP_COUNT} ops on ${SIZE}x${SIZE} median ${median?.toFixed(1)} ms ` +
        `(runs ${sorted.map((entry) => entry.toFixed(1)).join(', ')})`,
    );
    expect(median ?? Number.POSITIVE_INFINITY).toBeLessThan(BUDGET_MS);
  });
});
