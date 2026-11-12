import { describe, expect, it } from 'vitest';
import { base, compileOps, countPainted, INK_ALT, paint, roleRows } from './helpers.js';

function alt(compiled: ReturnType<typeof compileOps>['compiled']): number {
  return compiled.slots.resolve('alt.0') ?? -1;
}

describe('flood_fill', () => {
  it('fills a 4-connected region and stops at a wall', () => {
    const { compiled } = compileOps(
      [
        { op: 'rect', x: 4, y: 0, w: 1, h: 8, color: 'ink.0' },
        { op: 'flood_fill', x: 0, y: 0, color: 'alt.0' },
      ],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    const canvas = base(compiled);
    expect(canvas.get(3, 0)).toBe(alt(compiled));
    expect(canvas.get(4, 0)).toBe(compiled.slots.resolve('ink.0'));
    expect(canvas.get(5, 0)).toBe(-1);
    expect(paint(canvas)[0]).toBe('#####...');
  });

  it('stops a 4-connected fill at a diagonal join but lets 8-connectivity through', () => {
    const setup = [
      { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'ink.0' },
      { op: 'rect', x: 2, y: 2, w: 2, h: 2, color: 'ink.0' },
    ];
    const four = compileOps([...setup, { op: 'flood_fill', x: 0, y: 0, color: 'alt.0' }], {
      palette: INK_ALT,
      width: 8,
      height: 8,
    });
    const eight = compileOps(
      [...setup, { op: 'flood_fill', x: 0, y: 0, color: 'alt.0', connectivity: 8 }],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    expect(countPainted(base(four.compiled))).toBe(8);
    // Of the two 2x2 blocks, only the seeded one changed.
    expect(base(four.compiled).get(2, 2)).toBe(four.compiled.slots.resolve('ink.0'));
    expect(base(eight.compiled).get(2, 2)).toBe(eight.compiled.slots.resolve('alt.0'));
  });

  it('fills transparency like any other slot', () => {
    const { compiled } = compileOps([{ op: 'flood_fill', x: 0, y: 0, color: 'alt.0' }], {
      palette: INK_ALT,
      width: 8,
      height: 8,
    });
    expect(countPainted(base(compiled))).toBe(64);
  });

  it('matches on the resolved slot, so a fill does not consume its own writes', () => {
    // Two separate ink blocks stay separate: the fill of block one must not
    // reach block two through the slot it just wrote.
    const { compiled } = compileOps(
      [
        { op: 'rect', x: 0, y: 0, w: 8, h: 3, color: 'ink.0' },
        { op: 'rect', x: 0, y: 5, w: 8, h: 3, color: 'ink.0' },
        { op: 'flood_fill', x: 0, y: 0, color: 'alt.0' },
      ],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    const rows = roleRows(compiled);
    expect(rows.slice(0, 3)).toEqual(['00000000', '00000000', '00000000']);
    expect(rows.slice(3, 5)).toEqual(['........', '........']);
    expect(rows.slice(5)).toEqual(['00000000', '00000000', '00000000']);
  });

  it('reports a clipped seed outside the canvas without writing', () => {
    const { compiled } = compileOps([{ op: 'flood_fill', x: 20, y: 0, color: 'alt.0' }], {
      palette: INK_ALT,
      width: 8,
      height: 8,
    });
    expect(countPainted(base(compiled))).toBe(0);
    expect(compiled.warnings.some((warning) => warning.code === 'W_OUT_OF_BOUNDS')).toBe(true);
  });

  it('is a no-op when the seed already holds the fill slot', () => {
    const { compiled } = compileOps(
      [
        { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'alt.0' },
        { op: 'flood_fill', x: 0, y: 0, color: 'alt.0' },
      ],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    expect(countPainted(base(compiled))).toBe(4);
    expect(compiled.warnings).toEqual([]);
  });
});
