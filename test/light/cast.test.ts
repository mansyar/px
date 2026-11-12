import { describe, expect, it } from 'vitest';
import {
  codeOf,
  compiled,
  errorOf,
  familyRows,
  ownerRows,
  paintedCount,
  roleRows,
} from './helpers.js';

/** body sorts before rock, so in a two-part map their indexes are 0 and 1. */
const PARTS = { body: { material: 'steel' }, rock: { material: 'iron' } };
/** Every declared part must own pixels, so cases with no other role declare only the caster. */
const ROCK_ONLY = { rock: { material: 'iron' } };

function setup(extra: Record<string, unknown> = {}, parts = ROCK_ONLY) {
  return compiled({
    parts,
    ops: [
      { op: 'rect', x: 3, y: 3, w: 1, h: 1, color: 'iron.base', part: 'rock' },
      { op: 'light', form: 'flat', ao: false, rim: 'none', cast: 'rock', ...extra },
    ],
  });
}

describe('light cast: direction', () => {
  // The vector is pinned through the op: the shadow lands along the step the
  // angle names, so a test that only checked one corner could not tell a
  // transposed vector from the right one.
  const CORNERS: Array<[string, number, number]> = [
    ['top-left', 4, 4],
    ['top-right', 2, 4],
    ['bottom-left', 4, 2],
    ['bottom-right', 2, 2],
  ];

  for (const [angle, shadowX, shadowY] of CORNERS) {
    it(`throws the shadow one pixel toward ${angle}`, () => {
      const rows = roleRows(setup({ angle }));
      expect(rows[3]?.[3]).toBe('b');
      expect(rows[shadowY]?.[shadowX]).toBe('s');
      // Nothing else is painted: the shadow is one pixel, not a smear.
      expect(paintedCount(setup({ angle }))).toBe(2);
    });
  }
});

describe('light cast: offset', () => {
  it('follows cast_offset diagonally', () => {
    const two = setup({ cast_offset: 2 });
    expect(roleRows(two)[5]?.[5]).toBe('s');
    expect(roleRows(two)[4]?.[4]).toBe('.');
    const three = setup({ cast_offset: 3 });
    expect(roleRows(three)[6]?.[6]).toBe('s');
    expect(roleRows(three)[4]?.[4]).toBe('.');
  });

  it('rejects an offset outside 1-4', () => {
    expect(codeOf(() => setup({ cast_offset: 5 }))).toBe('E_BAD_PARAM');
    expect(codeOf(() => setup({ cast_offset: 0 }))).toBe('E_BAD_PARAM');
  });
});

describe('light cast: clipping', () => {
  it('drops a shadow that leaves the canvas without an error', () => {
    const compiledRecipe = compiled({
      parts: ROCK_ONLY,
      ops: [
        { op: 'set_pixels', points: [[7, 7]], color: 'iron.base', part: 'rock' },
        { op: 'light', form: 'flat', ao: false, rim: 'none', cast: 'rock' },
      ],
    });
    expect(ownerRows(compiledRecipe)[7]).toBe('.......0');
    expect(compiledRecipe.warnings.map((warning) => warning.code)).not.toContain('W_OUT_OF_BOUNDS');
  });
});

describe('light cast: who the shadow may cover', () => {
  it('skips a strictly higher owner', () => {
    const compiledRecipe = compiled({
      parts: { body: { material: 'steel', z: 3 }, rock: { material: 'iron', z: 1 } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 1, h: 1, color: 'iron.base', part: 'rock' },
        { op: 'rect', x: 2, y: 2, w: 1, h: 1, color: 'steel.base', part: 'body' },
        { op: 'light', form: 'flat', ao: false, rim: 'none', cast: 'rock' },
      ],
    });
    expect(roleRows(compiledRecipe)[2]?.[2]).toBe('b');
    expect(ownerRows(compiledRecipe)[2]).toBe('..0.....');
  });

  it('covers an equal owner and takes the pixel from it', () => {
    const compiledRecipe = compiled({
      parts: { body: { material: 'steel' }, rock: { material: 'iron' } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 1, h: 1, color: 'iron.base', part: 'rock' },
        { op: 'rect', x: 2, y: 2, w: 1, h: 1, color: 'steel.base', part: 'body' },
        // A body pixel the shadow does not reach, so the part is not left empty.
        { op: 'rect', x: 6, y: 6, w: 1, h: 1, color: 'steel.base', part: 'body' },
        { op: 'light', form: 'flat', ao: false, rim: 'none', cast: 'rock' },
      ],
    });
    // The colour is the caster's shadow and the owner moved with it, which is
    // what W_PART_OVERWRITE reports: the body lost a pixel to the rock.
    expect(familyRows(compiledRecipe)[2]).toBe('....si..........');
    expect(ownerRows(compiledRecipe)[2]).toBe('..1.....');
    expect(compiledRecipe.warnings.map((warning) => warning.code)).toContain('W_PART_OVERWRITE');
  });

  it('claims pixels that were transparent for the caster', () => {
    const compiledRecipe = setup();
    const rock = compiledRecipe.parts.find((part) => part.name === 'rock');
    expect(rock?.painted).toBe(2);
    expect(rock?.bounds).toEqual({ x: 3, y: 3, w: 2, h: 2 });
    expect(ownerRows(compiledRecipe)[4]).toBe('....0...');
  });
});

describe('light cast: snapshot semantics', () => {
  it('shadows do not cast shadows', () => {
    const compiledRecipe = compiled({
      parts: ROCK_ONLY,
      ops: [
        { op: 'rect', x: 3, y: 3, w: 2, h: 2, color: 'iron.base', part: 'rock' },
        { op: 'light', form: 'flat', ao: false, rim: 'none', cast: 'rock' },
      ],
    });
    const rows = roleRows(compiledRecipe);
    // (4,4) is a caster pixel and takes the shadow of (3,3); the shadow it would
    // have thrown in turn, (5,5), is created but (6,6) stays empty.
    expect(rows[4]?.[4]).toBe('s');
    expect(rows[5]?.[5]).toBe('s');
    expect(rows[6]?.[6]).toBe('.');
  });

  it('throws no shadow when cast is null', () => {
    const compiledRecipe = compiled({
      parts: ROCK_ONLY,
      ops: [
        { op: 'rect', x: 3, y: 3, w: 1, h: 1, color: 'iron.base', part: 'rock' },
        { op: 'light', form: 'flat', ao: false, rim: 'none' },
      ],
    });
    expect(roleRows(compiledRecipe)[4]?.[4]).toBe('.');
  });

  it('lands on the shaded form rather than being overwritten by it', () => {
    const compiledRecipe = compiled({
      parts: PARTS,
      ops: [
        { op: 'rect', x: 0, y: 0, w: 1, h: 1, color: 'iron.base', part: 'rock' },
        { op: 'rect', x: 1, y: 1, w: 1, h: 1, color: 'steel.base', part: 'body' },
        // The shadow takes (1,1); this pixel keeps the body alive.
        { op: 'rect', x: 5, y: 5, w: 1, h: 1, color: 'steel.base', part: 'body' },
        { op: 'light', form: 'bevel', ao: false, rim: 'none', cast: 'rock' },
      ],
    });
    // Bevel alone would make the lone body pixel a highlight; cast runs after
    // form, so the rock's shadow is what survives.
    expect(familyRows(compiledRecipe)[1]).toBe('..si............');
  });
});

describe('light cast: casters without a shadow role', () => {
  it('fails with E_NO_RAMP naming the family and the derive hint', () => {
    const error = errorOf(() =>
      compiled({
        palette: { ink: { colors: ['#000000'] }, iron: { ramp: { base: '#a06060' } } },
        parts: { rock: { material: 'ink' } },
        ops: [
          { op: 'set_pixels', points: [[1, 1]], color: 'ink.0', part: 'rock' },
          { op: 'light', form: 'flat', ao: false, rim: 'none', cast: 'rock' },
        ],
      }),
    );
    expect(error.code).toBe('E_NO_RAMP');
    expect(error.message).toContain('Family "ink"');
    expect(error.message).toContain('"shadow"');
    expect(error.message).toContain('light');
    expect(error.hint).toContain('--derive-ramps');
  });
});
