import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import { base, compileOps, countPainted, INK_ALT, SHADED } from './helpers.js';

function codeOf(run: () => void): string {
  try {
    run();
    return 'NO_THROW';
  } catch (error) {
    return error instanceof PxError ? error.code : 'NOT_PX';
  }
}

describe('replace_slot', () => {
  it('rewrites one slot to another inside the active layer', () => {
    const { compiled } = compileOps(
      [
        { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'ink.0' },
        { op: 'rect', x: 4, y: 0, w: 2, h: 2, color: 'alt.0' },
        { op: 'replace_slot', from: 'ink.0', to: 'alt.0' },
      ],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    const canvas = base(compiled);
    expect(canvas.get(0, 0)).toBe(compiled.slots.resolve('alt.0'));
    expect(countPainted(canvas)).toBe(8);
  });

  it('leaves every other layer untouched', () => {
    const { compiled } = compileOps([], {
      palette: INK_ALT,
      width: 8,
      height: 8,
      layers: [
        {
          id: 'base',
          ops: [
            { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'ink.0' },
            { op: 'replace_slot', from: 'ink.0', to: 'alt.0' },
          ],
        },
        { id: 'fx', ops: [{ op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'ink.0' }] },
      ],
    });
    expect(compiled.layers[0]?.canvas.get(0, 0)).toBe(compiled.slots.resolve('alt.0'));
    expect(compiled.layers[1]?.canvas.get(0, 0)).toBe(compiled.slots.resolve('ink.0'));
  });

  it('matches the exact slot, not the whole family', () => {
    const { compiled } = compileOps(
      [
        { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'cloth.base' },
        { op: 'rect', x: 4, y: 0, w: 2, h: 2, color: 'cloth.shadow' },
        { op: 'replace_slot', from: 'cloth.base', to: 'cloth.highlight' },
      ],
      { palette: SHADED, width: 8, height: 8 },
    );
    const canvas = base(compiled);
    expect(canvas.get(0, 0)).toBe(compiled.slots.resolve('cloth.highlight'));
    expect(canvas.get(4, 0)).toBe(compiled.slots.resolve('cloth.shadow'));
  });

  it('is a no-op when from and to are the same slot', () => {
    const { compiled } = compileOps(
      [
        { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'ink.0' },
        { op: 'replace_slot', from: 'ink.0', to: 'ink.0' },
      ],
      { palette: INK_ALT, width: 8, height: 8 },
    );
    expect(base(compiled).get(0, 0)).toBe(compiled.slots.resolve('ink.0'));
    expect(compiled.warnings).toEqual([]);
  });

  it('rejects an unknown slot on either side', () => {
    expect(
      codeOf(() =>
        compileOps([{ op: 'replace_slot', from: 'ink.9', to: 'alt.0' }], {
          palette: INK_ALT,
        }),
      ),
    ).toBe('E_UNKNOWN_SLOT');
    expect(
      codeOf(() =>
        compileOps([{ op: 'replace_slot', from: 'ink.0', to: 'ink.9' }], {
          palette: INK_ALT,
        }),
      ),
    ).toBe('E_UNKNOWN_SLOT');
  });
});
