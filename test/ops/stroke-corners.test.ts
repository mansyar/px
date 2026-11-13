/**
 * AC-13 (stroke half): absent options render exactly the pre-track bytes.
 *
 * `corner` and `cap` are opt-in. The defaults have to be the old geometry, not a
 * re-implementation of it, so the first test compares the default path against
 * the explicit `miter`/`butt` path and requires identical points.
 */

import { describe, expect, it } from 'vitest';
import { strokePath } from '../../src/core/ops/stroke.js';

const SITE = { opIndex: 0, layerId: 'base' };
const SQUARE: Array<[number, number]> = [
  [1, 1],
  [8, 1],
  [8, 8],
  [1, 8],
];
const LINE: Array<[number, number]> = [
  [1, 1],
  [9, 1],
];

describe('stroke corner and cap', () => {
  it('defaults to the pre-1.2 geometry', () => {
    const fallback = strokePath(SQUARE, { closed: true, smooth: false, width: 1 }, SITE);
    const explicit = strokePath(
      SQUARE,
      { closed: true, smooth: false, width: 1, corner: 'miter', cap: 'butt' },
      SITE,
    );
    expect(explicit).toEqual(fallback);
  });

  it('cuts no corners when corner is round', () => {
    const miter = strokePath(SQUARE, { closed: true, smooth: false, width: 1 }, SITE);
    const round = strokePath(
      SQUARE,
      { closed: true, smooth: false, width: 1, corner: 'round' },
      SITE,
    );
    expect(round.length).toBeGreaterThan(miter.length);
  });

  it('adds one cap pixel past each end when cap is round', () => {
    const butt = strokePath(LINE, { closed: false, smooth: false, width: 1 }, SITE);
    const round = strokePath(LINE, { closed: false, smooth: false, width: 1, cap: 'round' }, SITE);
    expect(round.length).toBe(butt.length + 2);
  });
});
