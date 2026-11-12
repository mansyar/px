import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import { base, compileOps, countPainted, roleRows, SHADED } from './helpers.js';

const BLOCK = { op: 'rect', x: 2, y: 2, w: 4, h: 4, color: 'cloth.base' };

function codeOf(run: () => void): string {
  try {
    run();
    return 'NO_THROW';
  } catch (error) {
    return error instanceof PxError ? error.code : 'NOT_PX';
  }
}

describe('auto_shade', () => {
  it('shades only the silhouette-adjacent rim', () => {
    const { compiled } = compileOps([BLOCK, { op: 'auto_shade', light_dir: 'top-left' }], {
      palette: SHADED,
      width: 8,
      height: 8,
    });
    expect(roleRows(compiled).slice(1, 7)).toEqual([
      '........',
      '..hhhh..',
      '..hbbs..',
      '..hbbs..',
      '..hsss..',
      '........',
    ]);
  });

  it('never modifies an interior pixel', () => {
    const plain = compileOps([BLOCK], { palette: SHADED, width: 8, height: 8 });
    const shaded = compileOps([BLOCK, { op: 'auto_shade', light_dir: 'top-left' }], {
      palette: SHADED,
      width: 8,
      height: 8,
    });
    const interior = [
      [3, 3],
      [4, 3],
      [3, 4],
      [4, 4],
    ] as const;
    for (const [x, y] of interior) {
      expect(base(shaded.compiled).get(x, y)).toBe(base(plain.compiled).get(x, y));
    }
    // Exactly the 12 border pixels changed, and every one of them touches
    // transparent space.
    const changed: Array<[number, number]> = [];
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        if (base(shaded.compiled).get(x, y) !== base(plain.compiled).get(x, y)) {
          changed.push([x, y]);
        }
      }
    }
    expect(changed).toHaveLength(12);
    for (const [x, y] of changed) {
      const neighbours = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ];
      expect(neighbours.some(([nx, ny]) => base(plain.compiled).get(nx, ny) === -1)).toBe(true);
    }
  });

  it('flips highlight and shadow with the light direction', () => {
    const { compiled } = compileOps([BLOCK, { op: 'auto_shade', light_dir: 'bottom-right' }], {
      palette: SHADED,
      width: 8,
      height: 8,
    });
    const rows = roleRows(compiled);
    // Light from the bottom right: the bottom and right edges catch it, and
    // highlight wins at a corner that faces both ways.
    expect(rows[2]).toBe('..sssh..');
    expect(rows[5]).toBe('..hhhh..');
  });

  it('rejects a flat family with E_NO_RAMP and the derive hint', () => {
    let hint = '';
    let code = '';
    try {
      compileOps(
        [
          { op: 'rect', x: 2, y: 2, w: 4, h: 4, color: 'skin.0' },
          { op: 'auto_shade', light_dir: 'top-left' },
        ],
        { palette: SHADED, width: 8, height: 8 },
      );
    } catch (error) {
      if (error instanceof PxError) {
        code = error.code;
        hint = error.hint;
      }
    }
    expect(code).toBe('E_NO_RAMP');
    expect(hint).toContain('--derive-ramps');
  });

  it('leaves pixels of a ramp family that lacks the role untouched', () => {
    const partial = { cloth: { ramp: { base: '#880000' } } };
    const { compiled } = compileOps([BLOCK, { op: 'auto_shade', light_dir: 'top-left' }], {
      palette: partial,
      width: 8,
      height: 8,
    });
    expect(countPainted(base(compiled))).toBe(16);
    expect(codeOf(() => compileOps([BLOCK], { palette: partial }))).toBe('NO_THROW');
  });
});
