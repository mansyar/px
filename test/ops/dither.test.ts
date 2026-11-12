import { describe, expect, it } from 'vitest';
import { base, compileOps, countPainted, paint } from './helpers.js';

describe('dither_fill', () => {
  it('paints checker_50 where x + y is even', () => {
    const { compiled } = compileOps(
      [{ op: 'dither_fill', x: 0, y: 0, w: 4, h: 4, color: 'ink.0', pattern: 'checker_50' }],
      { width: 8, height: 8 },
    );
    expect(paint(base(compiled)).slice(0, 4)).toEqual([
      '#.#.....',
      '.#.#....',
      '#.#.....',
      '.#.#....',
    ]);
  });

  it('paints bayer_25 at the quarter of cells below the 25% threshold', () => {
    const { compiled } = compileOps(
      [{ op: 'dither_fill', x: 0, y: 0, w: 4, h: 4, color: 'ink.0', pattern: 'bayer_25' }],
      { width: 8, height: 8 },
    );
    expect(paint(base(compiled)).slice(0, 4)).toEqual([
      '#.#.....',
      '........',
      '#.#.....',
      '........',
    ]);
    expect(countPainted(base(compiled))).toBe(4);
  });

  it('keys the pattern to absolute coordinates, not the op origin', () => {
    const { compiled } = compileOps(
      [
        { op: 'dither_fill', x: 1, y: 0, w: 2, h: 2, color: 'ink.0', pattern: 'checker_50' },
        { op: 'dither_fill', x: 3, y: 0, w: 2, h: 2, color: 'ink.0', pattern: 'checker_50' },
      ],
      { width: 8, height: 8 },
    );
    // Rect one starts on an odd column, rect two on an odd column as well, so
    // the two share a phase instead of restarting their own.
    expect(paint(base(compiled)).slice(0, 2)).toEqual(['..#.#...', '.#.#....']);
  });

  it('repeats the bayer matrix every four pixels in both axes', () => {
    const { compiled } = compileOps(
      [{ op: 'dither_fill', x: 0, y: 0, w: 8, h: 8, color: 'ink.0', pattern: 'bayer_25' }],
      { width: 8, height: 8 },
    );
    const rows = paint(base(compiled));
    expect(rows[4]).toBe(rows[0]);
    expect(rows[0]).toBe('#.#.#.#.');
  });

  it('clips and warns when part of the rect is outside the canvas', () => {
    const { compiled } = compileOps(
      [{ op: 'dither_fill', x: 6, y: 6, w: 4, h: 4, color: 'ink.0', pattern: 'checker_50' }],
      { width: 8, height: 8 },
    );
    expect(compiled.warnings.some((warning) => warning.code === 'W_OUT_OF_BOUNDS')).toBe(true);
    expect(countPainted(base(compiled))).toBeGreaterThan(0);
  });
});
