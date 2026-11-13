import { describe, expect, it } from 'vitest';
import { compiled, familyRows, roleRows } from './helpers.js';

describe('light pass order: form, ao, cast, rim', () => {
  it('shows each stage on the pixel only that stage can reach', () => {
    const compiledRecipe = compiled({
      parts: {
        front: { material: 'steel' },
        rock: { material: 'iron', z: 1 },
        wall: { material: 'steel', z: 2 },
      },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'steel.base', part: 'front' },
        // Painted over the front, so it occludes from inside the silhouette.
        { op: 'set_pixels', points: [[2, 2]], color: 'steel.base', part: 'wall' },
        { op: 'set_pixels', points: [[0, 0]], color: 'iron.base', part: 'rock' },
        {
          op: 'light',
          angle: 'top-left',
          form: 'bevel',
          ao: true,
          cast: 'rock',
          cast_offset: 3,
          rim: 'edge',
        },
      ],
    });
    expect(roleRows(compiledRecipe).slice(1, 5)).toEqual([
      '.hhhh...',
      '.hhbs...',
      '.hbss...',
      '.hsss...',
    ]);
    // (3,2) is lit by the bevel against the wall, then AO takes it to base: form
    // runs before AO. (3,3) carries the rock's own shadow role, which only cast
    // can write: cast runs after AO and does not use the front's family.
    expect(familyRows(compiledRecipe)[2]?.slice(6, 8)).toBe('bs');
    expect(familyRows(compiledRecipe)[3]?.slice(6, 8)).toBe('si');
  });

  it('rim overwrites a form highlight the light never reaches without it', () => {
    const ops = [
      { op: 'rect', x: 1, y: 1, w: 3, h: 3, color: 'steel.base', part: 'front' },
      { op: 'rect', x: 4, y: 1, w: 1, h: 3, color: 'steel.base', part: 'block' },
    ];
    const withRim = compiled({
      parts: { block: { material: 'steel' }, front: { material: 'steel' } },
      ops: [...ops, { op: 'light', angle: 'bottom-right', form: 'bevel', ao: false, rim: 'edge' }],
    });
    const without = compiled({
      parts: { block: { material: 'steel' }, front: { material: 'steel' } },
      ops: [...ops, { op: 'light', angle: 'bottom-right', form: 'bevel', ao: false, rim: 'none' }],
    });
    // Bevel honours the foreign part on the right, which faces a bottom-right
    // light, so it highlights (3,1). Rim's edge rule looks only at transparency,
    // sees the dark top side, and shadows it instead.
    expect(roleRows(without)[1]?.[3]).toBe('h');
    expect(roleRows(withRim)[1]?.[3]).toBe('s');
  });
});
