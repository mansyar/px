import { describe, expect, it } from 'vitest';
import { base, compileOps, countPainted, INK_ALT, paint } from './helpers.js';

describe('ascii_blit', () => {
  it('stamps a legend grid exactly at the origin', () => {
    const { compiled } = compileOps(
      [
        {
          op: 'ascii_blit',
          x: 1,
          y: 1,
          grid: ['ab.', '.cd', '...'],
          legend: { a: 'ink.0', b: 'alt.0', c: 'alt.0', d: 'ink.0' },
        },
      ],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    const canvas = base(compiled);
    expect(paint(canvas)[1]).toBe('.##.....');
    expect(paint(canvas)[2]).toBe('..##....');
    expect(canvas.get(1, 1)).toBe(compiled.slots.resolve('ink.0'));
    expect(canvas.get(2, 1)).toBe(compiled.slots.resolve('alt.0'));
    expect(canvas.get(2, 2)).toBe(compiled.slots.resolve('alt.0'));
    expect(canvas.get(3, 2)).toBe(compiled.slots.resolve('ink.0'));
    expect(countPainted(canvas)).toBe(4);
  });

  it('treats `.` as transparent unless the legend defines it', () => {
    const undotted = compileOps(
      [{ op: 'ascii_blit', x: 0, y: 0, grid: ['.#'], legend: { '#': 'ink.0' } }],
      { width: 8, height: 8 },
    );
    expect(paint(base(undotted.compiled))[0]).toBe('.#......');

    const dotted = compileOps(
      [{ op: 'ascii_blit', x: 0, y: 0, grid: ['.'], legend: { '.': 'ink.0' } }],
      { width: 8, height: 8 },
    );
    expect(paint(base(dotted.compiled))[0]).toBe('#.......');
  });

  it('rejects rows of unequal length', () => {
    expect(() =>
      compileOps([{ op: 'ascii_blit', x: 0, y: 0, grid: ['ab', 'a'], legend: { a: 'ink.0' } }]),
    ).toThrowError(/row 1 has 1 characters; row 0 has 2/);
  });

  it('reports the character, row, and column of an unknown glyph', () => {
    expect(() =>
      compileOps([{ op: 'ascii_blit', x: 0, y: 0, grid: ['a', 'x'], legend: { a: 'ink.0' } }]),
    ).toThrowError(/"x" at row 1, column 0/);
  });

  it('clips and warns when the stamp runs off the canvas', () => {
    const { compiled } = compileOps(
      [{ op: 'ascii_blit', x: -1, y: 0, grid: ['ab'], legend: { a: 'ink.0', b: 'ink.0' } }],
      { width: 8, height: 8 },
    );
    expect(paint(base(compiled))[0]).toBe('#.......');
    expect(compiled.warnings.some((warning) => warning.code === 'W_OUT_OF_BOUNDS')).toBe(true);
  });
});
