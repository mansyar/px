import { describe, expect, it } from 'vitest';
import { CLOTH, compiled, paintedCount, roleRows } from './helpers.js';

const PARTS = { body: { material: 'steel' } };

function block(extra: Record<string, unknown> = {}) {
  return [
    { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'steel.base', part: 'body' },
    { op: 'light', ao: false, rim: 'none', cast: null, ...extra },
  ];
}

/** The 4x4 window the fixtures paint, so an assertion reads as the artwork. */
function window(rows: string[]): string[] {
  return rows.slice(1, 5).map((row) => row.slice(1, 5));
}

describe('light form: flat', () => {
  it('shades nothing and reports a no-op', () => {
    const compiledRecipe = compiled({ parts: PARTS, ops: block({ form: 'flat' }) });
    expect(paintedCount(compiledRecipe)).toBe(16);
    expect(window(roleRows(compiledRecipe))).toEqual(['bbbb', 'bbbb', 'bbbb', 'bbbb']);
    expect(compiledRecipe.warnings.map((warning) => warning.code)).toContain('W_PASS_NOOP');
  });
});

describe('light form: bevel', () => {
  // A one-pixel band on the part's own silhouette takes the role its outward
  // normal earns. The four corners pin which way the light travels, and the lit
  // normal wins at a corner because it is tested first, exactly as auto_shade.
  const CORNERS: Array<[string, string[]]> = [
    ['top-left', ['hhhh', 'hbbs', 'hbbs', 'hsss']],
    ['top-right', ['hhhh', 'sbbh', 'sbbh', 'sssh']],
    ['bottom-left', ['hsss', 'hbbs', 'hbbs', 'hhhh']],
    ['bottom-right', ['sssh', 'sbbh', 'sbbh', 'hhhh']],
  ];

  for (const [angle, expected] of CORNERS) {
    it(`lights ${angle} and shadows the opposite side`, () => {
      const compiledRecipe = compiled({ parts: PARTS, ops: block({ angle }) });
      expect(window(roleRows(compiledRecipe))).toEqual(expected);
    });
  }

  it('leaves the interior at base and touches nothing outside the part', () => {
    const rows = roleRows(compiled({ parts: PARTS, ops: block() }));
    expect(rows[0]).toBe('........');
    expect(rows[5]).toBe('........');
    expect(rows[2]?.[2]).toBe('b');
  });

  it('treats a foreign part as a boundary in both directions', () => {
    const compiledRecipe = compiled({
      parts: { head: { material: 'steel' }, tail: { material: 'steel' } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 2, h: 2, color: 'steel.base', part: 'head' },
        { op: 'rect', x: 3, y: 1, w: 2, h: 2, color: 'steel.base', part: 'tail' },
        { op: 'light', ao: false, rim: 'none' },
      ],
    });
    // head's right edge faces away from a top-left light; tail's left edge faces it.
    expect(window(roleRows(compiledRecipe))).toEqual(['hhhh', 'hshs', '....', '....']);
  });

  it('is idempotent, so the pass never reads its own output', () => {
    const compiledRecipe = compiled({
      parts: PARTS,
      ops: [...block(), { op: 'light', ao: false, rim: 'none', cast: null }],
    });
    expect(window(roleRows(compiledRecipe))).toEqual(['hhhh', 'hbbs', 'hbbs', 'hsss']);
  });
});

describe('light form: round', () => {
  it('bands the part along the light axis with three occupied ranks', () => {
    const compiledRecipe = compiled({ parts: PARTS, ops: block({ form: 'round' }) });
    // Seven occupied projections over three bands: ranks 0-2 lit, 3-4 base, 5-6 dark.
    expect(window(roleRows(compiledRecipe))).toEqual(['hhhb', 'hhbb', 'hbbs', 'bbss']);
  });

  it('ranks each part on its own projection, not the layer bounding box', () => {
    const compiledRecipe = compiled({
      parts: { left: { material: 'steel' }, right: { material: 'steel' } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 1, h: 4, color: 'steel.base', part: 'left' },
        { op: 'rect', x: 4, y: 1, w: 1, h: 4, color: 'steel.base', part: 'right' },
        { op: 'light', form: 'round', ao: false, rim: 'none' },
      ],
    });
    // Equal columns prove equal rank sets: a layer-wide ranking would give the
    // left column every highlight and the right column every shadow.
    expect(window(roleRows(compiledRecipe))).toEqual(['h..h', 'h..h', 'b..b', 's..s']);
  });
});

describe('light form: role resolution', () => {
  it('leaves a layer alone when its family has no shading roles', () => {
    const compiledRecipe = compiled({
      palette: { ink: { colors: ['#000000'] } },
      ops: [{ op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'ink.0' }, { op: 'light' }],
    });
    expect(window(roleRows(compiledRecipe))).toEqual(['0000', '0000', '0000', '0000']);
    expect(compiledRecipe.warnings.map((warning) => warning.code)).toContain('W_PASS_NOOP');
  });

  it('treats a layer with no parts as one implicit part in the first family', () => {
    const compiledRecipe = compiled({
      palette: CLOTH,
      ops: [
        { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'cloth.base' },
        { op: 'light', ao: false, rim: 'none' },
      ],
    });
    expect(window(roleRows(compiledRecipe))).toEqual(['hhhh', 'hbbs', 'hbbs', 'hsss']);
  });

  it('writes one pixel once per form pass', () => {
    const compiledRecipe = compiled({ parts: PARTS, ops: block() });
    expect(paintedCount(compiledRecipe)).toBe(16);
  });
});
