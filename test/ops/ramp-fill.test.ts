import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import { base, compileOps, roleRows, SHADED } from './helpers.js';

const BLOCK = { op: 'rect', x: 0, y: 0, w: 8, h: 4, color: 'cloth.base' };

function ramp(bands: number, lightDir: string) {
  return compileOps([BLOCK, { op: 'ramp_fill', bands, light_dir: lightDir }], {
    palette: SHADED,
    width: 8,
    height: 8,
  });
}

function codeOf(run: () => void): string {
  try {
    run();
    return 'NO_THROW';
  } catch (error) {
    return error instanceof PxError ? error.code : 'NOT_PX';
  }
}

describe('ramp_fill', () => {
  it('splits the layer into exactly two bands along the light axis', () => {
    const { compiled } = ramp(2, 'top-left');
    expect(roleRows(compiled).slice(0, 4)).toEqual([
      'hhhhhhss',
      'hhhhhsss',
      'hhhhssss',
      'hhhsssss',
    ]);
  });

  it('splits into three bands with base in the middle', () => {
    const { compiled } = ramp(3, 'top-left');
    expect(roleRows(compiled).slice(0, 4)).toEqual([
      'hhhhbbbb',
      'hhhbbbbs',
      'hhbbbbss',
      'hbbbbsss',
    ]);
  });

  it('produces bands - 1 role transitions while every band has its own role', () => {
    for (const bands of [2, 3]) {
      const { compiled } = ramp(bands, 'top-left');
      // Every pixel with the same x + y falls in the same bucket, so read one
      // pixel per slice index along the axis.
      const roles: string[] = [];
      for (let s = 0; s <= 10; s += 1) {
        const x = Math.min(s, 7);
        const y = s - x;
        roles.push(roleRows(compiled)[y]?.[x] ?? '?');
      }
      let transitions = 0;
      for (let i = 1; i < roles.length; i += 1) {
        if (roles[i] !== roles[i - 1]) {
          transitions += 1;
        }
      }
      expect(transitions).toBe(bands - 1);
    }
  });

  it('rejects band counts outside 2..3 with E_BANDS_RANGE and the reason', () => {
    for (const bands of [0, 1, 4, 5, 6]) {
      let code = '';
      let message = '';
      let hint = '';
      try {
        compileOps([{ op: 'ramp_fill', bands, light_dir: 'top-left' }], { palette: SHADED });
      } catch (error) {
        if (error instanceof PxError) {
          code = error.code;
          message = error.message;
          hint = error.hint;
        }
      }
      expect(code).toBe('E_BANDS_RANGE');
      expect(message).toContain(`has ${bands} bands`);
      expect(hint).toContain('three shading roles');
    }
  });

  it('accepts the whole legal domain', () => {
    for (const bands of [2, 3]) {
      expect(codeOf(() => ramp(bands, 'top-left'))).toBe('NO_THROW');
    }
  });

  it('moves the light with light_dir', () => {
    const { compiled } = ramp(2, 'top-right');
    expect(roleRows(compiled)[0]).toBe('sshhhhhh');
  });

  it('leaves transparent pixels alone', () => {
    const { compiled } = ramp(2, 'top-left');
    expect(roleRows(compiled).slice(4, 8)).toEqual([
      '........',
      '........',
      '........',
      '........',
    ]);
  });

  it('rejects a flat family with E_NO_RAMP and the derive hint', () => {
    let code = '';
    let hint = '';
    try {
      compileOps(
        [
          { op: 'rect', x: 0, y: 0, w: 8, h: 4, color: 'skin.0' },
          { op: 'ramp_fill', bands: 3, light_dir: 'top-left' },
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

  it('is deterministic for the same input', () => {
    const first = ramp(3, 'bottom-left');
    const second = ramp(3, 'bottom-left');
    expect(roleRows(first.compiled)).toEqual(roleRows(second.compiled));
    expect(base(first.compiled).slots).toEqual(base(second.compiled).slots);
  });
});
