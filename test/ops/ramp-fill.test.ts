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

  it('rejects a band count the region cannot display, naming the maximum', () => {
    // A 2x1 region projects to two light-axis positions, so only two buckets
    // can ever fill; three bands would silently deliver one transition.
    let code = '';
    let message = '';
    let hint = '';
    let location: unknown;
    try {
      compileOps(
        [
          { op: 'rect', x: 0, y: 0, w: 2, h: 1, color: 'cloth.base' },
          { op: 'ramp_fill', bands: 3, light_dir: 'top-left' },
        ],
        { palette: SHADED },
      );
    } catch (error) {
      if (error instanceof PxError) {
        code = error.code;
        message = error.message;
        hint = error.hint;
        location = error.location;
      }
    }
    expect(code).toBe('E_REGION_TOO_THIN');
    expect(message).toContain('supports at most 2');
    expect(hint).toContain('bands 2 or fewer');
    expect(location).toEqual({ layer: 'base', op_index: 1 });
  });

  it('gives every band a turn when the region has a gap', () => {
    // Two 3x1 blocks on one row at x 0-2 and 6-8. The bounding box spans nine
    // positions but only six are occupied, so ranking by distance would split
    // the painted pixels into highlight|shadow and never paint `base`.
    const { compiled } = compileOps(
      [
        { op: 'rect', x: 0, y: 0, w: 3, h: 1, color: 'cloth.base' },
        { op: 'rect', x: 6, y: 0, w: 3, h: 1, color: 'cloth.base' },
        { op: 'ramp_fill', bands: 3, light_dir: 'top-left' },
      ],
      { palette: SHADED, width: 9, height: 8 },
    );
    const row = roleRows(compiled)[0] ?? '';
    expect(row).toBe('hhb...bss');

    const paintedRoles = [...row].filter((role) => role !== '.');
    let transitions = 0;
    for (let i = 1; i < paintedRoles.length; i += 1) {
      if (paintedRoles[i] !== paintedRoles[i - 1]) {
        transitions += 1;
      }
    }
    expect(new Set(paintedRoles)).toEqual(new Set(['h', 'b', 's']));
    expect(transitions).toBe(2);
  });

  it('guards the occupied count, not the bounding-box extent', () => {
    // Two pixels three columns apart: the extent is three positions, but only
    // two positions are painted, so a third band would go unfilled.
    let code = '';
    let message = '';
    let hint = '';
    try {
      compileOps(
        [
          {
            op: 'set_pixels',
            points: [
              [0, 0],
              [2, 0],
            ],
            color: 'cloth.base',
          },
          { op: 'ramp_fill', bands: 3, light_dir: 'top-left' },
        ],
        { palette: SHADED, width: 8, height: 8 },
      );
    } catch (error) {
      if (error instanceof PxError) {
        code = error.code;
        message = error.message;
        hint = error.hint;
      }
    }
    expect(code).toBe('E_REGION_TOO_THIN');
    expect(message).toContain('occupies only 2');
    expect(message).toContain('supports at most 2');
    expect(hint).toContain('bands 2 or fewer');
  });

  it('does not suggest a band count the parser rejects', () => {
    // Two diagonally adjacent pixels project to a single light-axis position,
    // so no legal band count is displayable: the hint may only ask for more
    // positions. `bands` below 2 is `E_BANDS_RANGE`, so "pass bands 1 or fewer"
    // would send the caller into a second error.
    let code = '';
    let hint = '';
    try {
      compileOps(
        [
          {
            op: 'set_pixels',
            points: [
              [0, 1],
              [1, 0],
            ],
            color: 'cloth.base',
          },
          { op: 'ramp_fill', bands: 2, light_dir: 'top-left' },
        ],
        { palette: SHADED, width: 8, height: 8 },
      );
    } catch (error) {
      if (error instanceof PxError) {
        code = error.code;
        hint = error.hint;
      }
    }
    expect(code).toBe('E_REGION_TOO_THIN');
    expect(hint).toContain('at least two light-axis positions');
    expect(hint).not.toContain('or fewer');
    expect(hint).not.toMatch(/bands \d/);
  });

  it('accepts the whole legal domain', () => {
    for (const bands of [2, 3]) {
      expect(codeOf(() => ramp(bands, 'top-left'))).toBe('NO_THROW');
    }
  });

  it('moves the light with light_dir', () => {
    // The first role row of the 8x4 block at bands 2, for every accepted
    // direction: bottom-right is the mirror of top-left, bottom-left is
    // bottom-right's mirror across the vertical axis.
    const firstRows: Record<string, string> = {
      'top-left': 'hhhhhhss',
      'top-right': 'sshhhhhh',
      'bottom-left': 'hhhsssss',
      'bottom-right': 'ssssshhh',
    };
    for (const [lightDir, row] of Object.entries(firstRows)) {
      expect(roleRows(ramp(2, lightDir).compiled)[0]).toBe(row);
    }
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
