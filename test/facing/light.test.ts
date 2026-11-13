import { describe, expect, it } from 'vitest';
import { compiled, PALETTE, rows, slotAt } from './helpers.js';

/**
 * P1.T3 — light integration.
 *
 * Plane shading is a colour stage that runs before form. These tests pin the two
 * halves of FR-3 that are easy to get wrong: `flat` must not swallow plane
 * shading, and a part with no facing must not be shaded by it. They also pin the
 * property the previous track's High finding was about — the pass writes colours
 * and never owners.
 */

describe('form and plane shading', () => {
  it('plane-shades a flat part that declares a facing (AC-3)', () => {
    const result = compiled({
      parts: { wall: { material: 'steel', facing: 'right' } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 3, h: 3, color: 'steel.base', part: 'wall' },
        { op: 'light', form: 'flat', ao: false, rim: 'none' },
      ],
    });
    expect(rows(result)).toEqual([
      '........',
      '.sss....',
      '.sss....',
      '.sss....',
      '........',
      '........',
      '........',
      '........',
    ]);
  });

  it('shades nothing for a flat part without a facing (AC-3)', () => {
    const result = compiled({
      parts: { wall: { material: 'steel' } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 3, h: 3, color: 'steel.highlight', part: 'wall' },
        { op: 'light', form: 'flat', ao: false, rim: 'none' },
      ],
    });
    // Every painted pixel keeps the tone it was painted with.
    expect(slotAt(result, 1, 1)).toBe('steel.highlight');
    expect(slotAt(result, 3, 3)).toBe('steel.highlight');
  });

  it('lets form refine inside a plane rather than replace it', () => {
    const result = compiled({
      parts: { box: { material: 'steel', facing: 'front' } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'steel.base', part: 'box' },
        { op: 'light', form: 'bevel', ao: false, rim: 'none' },
      ],
    });
    // The top edge of a base plane is still lit and the bottom edge still dark;
    // the plane tone is what bevel refines, not what it replaces.
    expect(rows(result)[1]?.slice(1, 5)).toBe('hhhh');
    expect(rows(result)[2]?.slice(1, 5)).toBe('hbbs');
    expect(slotAt(result, 1, 1)).toBe('steel.highlight');
    expect(slotAt(result, 2, 2)).toBe('steel.base');
  });
});

describe('stage order', () => {
  it('applies the plane before AO, so AO deepens the plane tone', () => {
    const result = compiled({
      parts: {
        wall: { material: 'steel', facing: 'front' },
        rock: { material: 'steel', z: 1 },
      },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 3, h: 3, color: 'steel.base', part: 'wall' },
        { op: 'set_pixels', points: [[1, 1]], color: 'steel.base', part: 'rock' },
        { op: 'light', form: 'flat', ao: true, rim: 'none' },
      ],
    });
    // rock sits at z=1 over wall's corner: the wall pixel under it steps from
    // the plane's base down to shadow, which only composes if the plane ran first.
    expect(slotAt(result, 2, 1)).toBe('steel.shadow');
  });

  it('applies the plane before rim, so rim still recolours a silhouette', () => {
    const parts = { wall: { material: 'steel', facing: 'front' } };
    const ops = [
      { op: 'rect', x: 1, y: 1, w: 3, h: 3, color: 'steel.base', part: 'wall' },
      { op: 'light', form: 'flat', ao: false, rim: 'edge' },
    ];
    const withRim = compiled({ parts, ops });
    const without = compiled({
      parts,
      ops: [ops[0], { op: 'light', form: 'flat', ao: false, rim: 'none' }],
    });
    expect(rows(withRim)).not.toEqual(rows(without));
    // The perimeter is rimmed; the interior is still exactly the plane tone.
    expect(slotAt(withRim, 2, 2)).toBe('steel.base');
    expect(slotAt(without, 2, 2)).toBe('steel.base');
  });
});

describe('ownership', () => {
  const ops = [
    { op: 'rect', x: 0, y: 0, w: 3, h: 2, color: 'steel.base', part: 'wall' },
    { op: 'rect', x: 4, y: 0, w: 3, h: 2, color: 'steel.base', part: 'roof' },
    { op: 'light', form: 'bevel', ao: true, cast: 'roof', cast_offset: 1, rim: 'edge' },
  ];

  it('never changes which part owns a pixel', () => {
    const shaded = compiled({
      parts: {
        wall: { material: 'steel', facing: 'left' },
        roof: { material: 'steel', facing: 'top' },
      },
      ops,
    });
    const plain = compiled({
      parts: { wall: { material: 'steel' }, roof: { material: 'steel' } },
      ops,
    });
    expect(Array.from(shaded.owners)).toEqual(Array.from(plain.owners));
    expect(shaded.parts.map((part) => part.painted)).toEqual(
      plain.parts.map((part) => part.painted),
    );
  });

  it('reports no part overwrite, because it displaces nothing', () => {
    const shaded = compiled({
      palette: PALETTE,
      parts: {
        wall: { material: 'steel', facing: 'left' },
        roof: { material: 'steel', facing: 'top' },
      },
      ops,
    });
    const codes = shaded.warnings.map((warning) => warning.code);
    expect(codes).not.toContain('W_PART_OVERWRITE');
  });

  it('is a colour pass: every painted pixel of a facing part is still painted', () => {
    const shaded = compiled({
      parts: { wall: { material: 'steel', facing: 'right' } },
      ops: [{ op: 'rect', x: 0, y: 0, w: 3, h: 3, color: 'steel.base', part: 'wall' }],
    });
    // No light op at all: facing has no effect and raises no warning.
    expect(shaded.warnings).toEqual([]);
    expect(slotAt(shaded, 1, 1)).toBe('steel.base');
  });
});
