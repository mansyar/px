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

// --- Lit scene: the same op budget, but every op belongs to a part and the layer
// --- runs a full light pass. This is the NFR-7 shape (parts + materials + light)
// --- rather than the bare-op shape above.
const PART_NAMES = ['rock', 'moss', 'water', 'ember'] as const;
const PART_BUDGET_MS = 500;

const PART_PALETTE: Record<string, { ramp: Record<string, string> }> = {
  rock: { ramp: { outline: '#2a3442', shadow: '#5a6a80', base: '#93a3b5', highlight: '#e2ecf8' } },
  moss: { ramp: { outline: '#1e2a14', shadow: '#3f5c2a', base: '#6f9a44', highlight: '#b8d98a' } },
  water: { ramp: { outline: '#0c1826', shadow: '#1c3a52', base: '#2f6a8a', highlight: '#7fc4dd' } },
  ember: { ramp: { outline: '#3a1006', shadow: '#8a2a10', base: '#e07028', highlight: '#ffd08a' } },
};

const PART_STYLES = {
  rock: { material: 'rock', gloss: 'metal', z: 1 },
  moss: { material: 'moss', gloss: 'cloth', z: 2 },
  water: { material: 'water', gloss: 'gem', z: 0 },
  ember: { material: 'ember', gloss: 'matte', z: 3 },
} as const;

function buildPartOps(): Op[] {
  const next = coordinates(0x0bad);
  const ops: Op[] = [];
  for (let index = 0; index < OP_COUNT; index += 1) {
    const x = Math.floor(next() * (SIZE - 16));
    const y = Math.floor(next() * (SIZE - 16));
    const part = PART_NAMES[index % PART_NAMES.length];
    const color: SlotRef = `${part}.${['base', 'shadow', 'highlight', 'outline'][index % 4]}`;
    switch (index % 4) {
      case 0:
        ops.push({ op: 'rect', x, y, w: 5, h: 5, color, part });
        break;
      case 1:
        ops.push({ op: 'line', x1: x, y1: y, x2: x + 9, y2: y + 4, color, part });
        break;
      case 2:
        ops.push({ op: 'ellipse', x, y, w: 7, h: 7, color, part });
        break;
      default:
        ops.push({
          op: 'set_pixels',
          points: [
            [x, y],
            [x + 3, y + 2],
          ],
          color,
          part,
        });
        break;
    }
  }
  ops.push({
    op: 'light',
    angle: 'top-left',
    form: 'round',
    ao: true,
    cast: 'rock',
    castOffset: 2,
    rim: 'edge',
  });
  return ops;
}

const litRecipe: Recipe = {
  version: '1.1',
  meta: { name: 'perf-lit', width: SIZE, height: SIZE, alphaMode: 'binary' },
  palette: PART_PALETTE,
  parts: PART_STYLES,
  anchors: { origin: [0, 0] },
  layers: [{ id: 'base', ops: buildPartOps() }],
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

describe('2000 ops with parts and a full light pass on a 256x256 canvas', () => {
  it('renders to PNG in under 500 ms, measured on the median of five runs', () => {
    const warm = renderRecipe(litRecipe);
    expect(warm.png.length, 'the warm-up render must produce a PNG').toBeGreaterThan(0);
    expect(warm.compiled.parts.length, 'the lit scene must declare its parts').toBe(
      PART_NAMES.length,
    );

    const samples: number[] = [];
    for (let run = 0; run < RUNS; run += 1) {
      const started = performance.now();
      const output = renderRecipe(litRecipe);
      samples.push(performance.now() - started);
      expect([output.png[0], output.png[1], output.png[2], output.png[3]], 'PNG signature').toEqual(
        [0x89, 0x50, 0x4e, 0x47],
      );
    }

    const sorted = [...samples].sort((left, right) => left - right);
    const median = sorted[Math.floor(RUNS / 2)];
    expect(median).toBeDefined();
    console.log(
      `perf: ${OP_COUNT} ops + light on ${SIZE}x${SIZE} median ${median?.toFixed(1)} ms ` +
        `(runs ${sorted.map((entry) => entry.toFixed(1)).join(', ')})`,
    );
    expect(median ?? Number.POSITIVE_INFINITY).toBeLessThan(PART_BUDGET_MS);
  });
});
