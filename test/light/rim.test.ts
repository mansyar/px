import { describe, expect, it } from 'vitest';
import { compiled, familyRows, roleRows } from './helpers.js';

function single(extra: Record<string, unknown> = {}) {
  return compiled({
    parts: { body: { material: 'steel' } },
    ops: [
      { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'steel.base', part: 'body' },
      { op: 'light', form: 'flat', ao: false, rim: 'edge', ...extra },
    ],
  });
}

/** One 3x3 body per family, side by side, so selective has something to borrow. */
function neighbours(extra: Record<string, unknown> = {}) {
  return compiled({
    parts: { a: { material: 'steel' }, b: { material: 'iron' } },
    ops: [
      { op: 'rect', x: 1, y: 1, w: 3, h: 3, color: 'steel.base', part: 'a' },
      { op: 'rect', x: 4, y: 1, w: 3, h: 3, color: 'iron.base', part: 'b' },
      { op: 'light', form: 'flat', ao: false, rim: 'selective', ...extra },
    ],
  });
}

describe('light rim: edge', () => {
  it('paints only the boundary and leaves the interior at base', () => {
    expect(
      roleRows(single())
        .slice(1, 5)
        .map((row) => row.slice(1, 5)),
    ).toEqual(['hhhh', 'hbbs', 'hbbs', 'hsss']);
  });

  it('writes nothing when rim is none', () => {
    expect(
      roleRows(single({ rim: 'none' }))
        .slice(1, 5)
        .map((row) => row.slice(1, 5)),
    ).toEqual(['bbbb', 'bbbb', 'bbbb', 'bbbb']);
  });

  it('leaves a boundary alone when its family has no roles to write', () => {
    const compiledRecipe = compiled({
      palette: { ink: { colors: ['#000000'] } },
      parts: { body: { material: 'ink' } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'ink.0', part: 'body' },
        { op: 'light', form: 'flat', ao: false, rim: 'edge' },
      ],
    });
    expect(roleRows(compiledRecipe)[2]).toBe('.0000...');
  });
});

describe('light rim: selective', () => {
  it('borrows the neighbouring family outline against it', () => {
    const rows = familyRows(neighbours());
    // a's right column reads as an iron rim, b's left column as a steel rim.
    expect(rows[1]?.slice(6, 8)).toBe('oi');
    expect(rows[1]?.slice(8, 10)).toBe('os');
    // Elsewhere each part outlines itself against transparency.
    expect(rows[1]?.slice(2, 4)).toBe('os');
    expect(rows[1]?.slice(12, 14)).toBe('oi');
  });

  it('never touches an interior pixel', () => {
    const rows = familyRows(neighbours());
    expect(rows[2]?.slice(4, 6)).toBe('bs');
    expect(rows[2]?.slice(8, 10)).toBe('bi');
  });

  it('falls back to edge when the neighbouring family has no outline', () => {
    const compiledRecipe = compiled({
      palette: {
        steel: { ramp: { shadow: '#101820', base: '#8090a0', highlight: '#f0f4f8' } },
        ink: { colors: ['#000000'] },
      },
      parts: { a: { material: 'steel' }, b: { material: 'ink' } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 3, h: 3, color: 'steel.base', part: 'a' },
        { op: 'rect', x: 4, y: 1, w: 3, h: 3, color: 'ink.0', part: 'b' },
        { op: 'light', form: 'flat', ao: false, rim: 'selective' },
      ],
    });
    // a has no outline either, so the borrowed family's absence drops through
    // to the edge rule for the normal that faces it: the right-hand side of a
    // top-left light turns away, while a's open top still catches the light.
    expect(roleRows(compiledRecipe)[1]?.[3]).toBe('s');
    // (3,2) has no transparent neighbour, so selective leaves it at base even
    // though the ink family touches it: only silhouettes are rimmed.
    expect(roleRows(compiledRecipe)[2]?.[3]).toBe('b');
    expect(roleRows(compiledRecipe)[3]?.[3]).toBe('s');
    expect(roleRows(compiledRecipe)[1]?.[2]).toBe('h');
  });
});

describe('light rim: pass order', () => {
  it('recolours a shadow that landed on a silhouette', () => {
    const compiledRecipe = compiled({
      parts: { body: { material: 'steel' }, rock: { material: 'iron' } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 1, h: 1, color: 'iron.base', part: 'rock' },
        { op: 'rect', x: 2, y: 2, w: 3, h: 3, color: 'steel.base', part: 'body' },
        { op: 'light', form: 'flat', ao: false, rim: 'edge', cast: 'rock' },
      ],
    });
    // The rock shadowed (2,2) and rim then made it a rim pixel, so the shadow is
    // gone: cast ran before rim. Rim first would have left the shadow on top.
    expect(roleRows(compiledRecipe)[2]).toBe('..hhh...');
  });
});
