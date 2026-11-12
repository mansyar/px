/**
 * Threshold calibration fixtures (AC-21).
 *
 * Every constant this phase touched keeps a fixture on both sides: one where
 * the rule stays silent because the shape is a deliberate idiom, and one where
 * it still fires on a genuine defect. A threshold with only the silent side is
 * a threshold that has been disabled.
 */

import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { lintCompiled } from '../../src/lint/index.js';
import { hasKink } from '../../src/lint/jaggy.js';
import {
  JAGGY_MAX_RUN,
  JAGGY_MIN_RUNS,
  JAGGY_STEP_JUMP,
  LOW_CONTRAST_MIN_RATIO,
} from '../../src/lint/thresholds.js';

/** One row of the silhouette per entry: `[firstPaintedColumn, width]`. */
type Row = [number, number];

function sprite(
  rows: readonly Row[],
  color = '#000000',
  size: [number, number] = [12, 16],
): string {
  const [width, height] = size;
  const points: Array<[number, number]> = [];
  rows.forEach(([first, count], y) => {
    for (let index = 0; index < count; index += 1) {
      points.push([first + index, y]);
    }
  });
  return JSON.stringify({
    version: 1,
    meta: { name: 'fixture', width, height, alpha_mode: 'binary' },
    palette: { main: { colors: [color, '#ffffff'] } },
    anchors: {},
    layers: [{ id: 'base', ops: [{ op: 'set_pixels', points, color: 'main.0' }] }],
  });
}

function findingsFor(text: string, code: string): Array<{ code: string; message: string }> {
  const { recipe } = parseRecipe(text);
  return lintCompiled(compileRecipe(recipe)).filter((finding) => finding.code === code);
}

const JAGGY = 'JAGGY_LINE';
const CONTRAST = 'LOW_CONTRAST';

/**
 * A hand-freehanded diagonal: two rows, then one, then three — steps 2,1,3.
 * The right edge stays straight so this yields exactly one finding.
 */
const KINK: Row[] = [
  [0, 6],
  [0, 6],
  [1, 5],
  [2, 4],
  [2, 4],
  [2, 4],
];

describe('JAGGY_LINE keeps firing on genuine defects', () => {
  it('reports a staircase that leaves its diagonal and returns', () => {
    const found = findingsFor(sprite(KINK), JAGGY);
    expect(found.length, 'a 2,1,3 staircase is the defect this rule exists for').toBe(1);
    expect(found[0]?.message).toContain('2,1,3');
    expect(found[0]?.message).toContain('left edge');
  });

  it('reports a three-row flat stretch in a one-row staircase', () => {
    const rows: Row[] = [
      [0, 6],
      [1, 5],
      [1, 5],
      [1, 5],
      [2, 4],
    ];
    expect(findingsFor(sprite(rows), JAGGY).length, '1,3,1 pinches the line').toBe(1);
  });

  it('keeps reading an edge after a long straight wall', () => {
    // Eight rows of straight wall, then a wobble: cutting the wall at
    // JAGGY_MAX_RUN must not silence the rest of the silhouette.
    const rows: Row[] = [
      [2, 6],
      [2, 6],
      [2, 6],
      [2, 6],
      [2, 6],
      [2, 6],
      [2, 6],
      [2, 6],
      [3, 5],
      [4, 4],
      [4, 4],
      [4, 4],
      [5, 3],
    ];
    expect(
      findingsFor(sprite(rows), JAGGY).length,
      'a kink after a straight side is still a kink',
    ).toBe(1);
  });
});

describe('JAGGY_LINE stays silent on deliberate pixel-art shapes', () => {
  it('accepts a chamfer that meets a vertical wall', () => {
    // Runs 1,5,1,2,3 — the potion and chest shoulders. Every slope change is
    // the shape turning, not the line wobbling.
    const rows: Row[] = [
      [6, 4],
      [5, 5],
      [5, 5],
      [5, 5],
      [5, 5],
      [5, 5],
      [4, 6],
      [3, 7],
      [3, 7],
      [2, 8],
      [2, 8],
      [2, 8],
    ];
    expect(findingsFor(sprite(rows), JAGGY)).toEqual([]);
  });

  it('accepts a four-line wall before a curve', () => {
    // Boundary of JAGGY_MAX_RUN: at four the wall is cut, so the curve is not
    // read as a pinch away from the wall.
    const rows: Row[] = [
      [6, 4],
      [6, 4],
      [6, 4],
      [6, 4],
      [5, 5],
      [4, 6],
      [3, 7],
    ];
    expect(JAGGY_MAX_RUN, 'a step may be at most this many rows').toBe(3);
    expect(findingsFor(sprite(rows), JAGGY)).toEqual([]);
  });

  it('accepts an accelerating curve', () => {
    const rows: Row[] = [
      [4, 6],
      [3, 7],
      [3, 7],
      [2, 8],
      [2, 8],
      [2, 8],
    ];
    expect(findingsFor(sprite(rows), JAGGY)).toEqual([]);
  });

  it('accepts the two run lengths a clean Bresenham 2:1 diagonal alternates', () => {
    const rows: Row[] = [
      [0, 8],
      [0, 8],
      [1, 7],
      [2, 6],
      [2, 6],
      [3, 5],
      [4, 4],
      [4, 4],
    ];
    expect(findingsFor(sprite(rows), JAGGY)).toEqual([]);
  });

  it('accepts a straight wall on its own', () => {
    const rows: Row[] = Array.from({ length: 10 }, () => [3, 6] as Row);
    expect(findingsFor(sprite(rows), JAGGY)).toEqual([]);
  });
});

describe('the kink rule reads the constants it claims to', () => {
  it('needs one run between two neighbours that agree with each other', () => {
    expect(hasKink([2, 1, 3]), 'neighbours differ by one, the middle breaks away').toBe(true);
    expect(hasKink([1, 3, 1]), 'a flat three between single rows').toBe(true);
    expect(hasKink([1, 2, 3]), 'a curve changes slope by one and keeps going').toBe(false);
    expect(
      hasKink([2, 1, 2]),
      `a one-row difference is below JAGGY_STEP_JUMP ${JAGGY_STEP_JUMP}`,
    ).toBe(false);
    expect(hasKink([3, 1]), `two runs are a corner, JAGGY_MIN_RUNS is ${JAGGY_MIN_RUNS}`).toBe(
      false,
    );
  });
});

describe('LOW_CONTRAST was left alone and still fires', () => {
  it('fires on edge pixels that vanish into the default backdrop', () => {
    const nearGrey = sprite(
      [
        [1, 4],
        [1, 4],
        [1, 4],
        [1, 4],
      ],
      '#8a8a8a',
      [8, 8],
    );
    expect(findingsFor(nearGrey, CONTRAST).length).toBe(1);
    expect(LOW_CONTRAST_MIN_RATIO, 'unchanged this phase: calibrated in phase 2').toBe(1.5);
  });

  it('stays silent when every edge pixel clears the floor', () => {
    const black = sprite(
      [
        [1, 4],
        [1, 4],
        [1, 4],
        [1, 4],
      ],
      '#000000',
      [8, 8],
    );
    expect(findingsFor(black, CONTRAST)).toEqual([]);
  });
});
