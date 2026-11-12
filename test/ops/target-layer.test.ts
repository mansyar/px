import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import { compileOps, countPainted, roleRows, SHADED } from './helpers.js';

const BLOCK = { op: 'rect', x: 2, y: 2, w: 4, h: 4, color: 'cloth.base' };

function layerRows(compiled: ReturnType<typeof compileOps>['compiled'], index: number): string[] {
  return roleRows(compiled, index);
}

describe('post-pass target_layer', () => {
  it('reads another layer and writes its own, leaving the source unchanged', () => {
    const { compiled } = compileOps([], {
      palette: SHADED,
      width: 8,
      height: 8,
      layers: [
        { id: 'base', ops: [BLOCK] },
        { id: 'fx', ops: [{ op: 'auto_shade', light_dir: 'top-left', target_layer: 'base' }] },
      ],
    });
    const source = compiled.layers[0];
    const target = compiled.layers[1];
    expect(source && countPainted(source.canvas)).toBe(16);
    expect(layerRows(compiled, 0).slice(2, 6)).toEqual([
      '..bbbb..',
      '..bbbb..',
      '..bbbb..',
      '..bbbb..',
    ]);
    expect(layerRows(compiled, 1).slice(2, 6)).toEqual([
      '..hhhh..',
      '..h..s..',
      '..h..s..',
      '..hsss..',
    ]);
    expect(target && countPainted(target.canvas)).toBe(12);
  });

  it('defaults to the layer containing the op', () => {
    const explicit = compileOps(
      [BLOCK, { op: 'auto_shade', light_dir: 'top-left', target_layer: 'base' }],
      { palette: SHADED, width: 8, height: 8 },
    );
    const implicit = compileOps([BLOCK, { op: 'auto_shade', light_dir: 'top-left' }], {
      palette: SHADED,
      width: 8,
      height: 8,
    });
    expect(roleRows(explicit.compiled)).toEqual(roleRows(implicit.compiled));
  });

  it('allows reading and writing the same layer for auto_outline', () => {
    const { compiled } = compileOps(
      [BLOCK, { op: 'auto_outline', where: 'outer', color: 'cloth.outline' }],
      { palette: SHADED, width: 8, height: 8 },
    );
    expect(compiled.layers[0]?.canvas.get(2, 1)).toBe(compiled.slots.resolve('cloth.outline'));
  });

  it('rejects an unknown target layer at parse time', () => {
    let code = '';
    try {
      compileOps([], {
        palette: SHADED,
        width: 8,
        height: 8,
        layers: [
          { id: 'base', ops: [BLOCK] },
          {
            id: 'fx',
            ops: [{ op: 'ramp_fill', bands: 2, light_dir: 'top-left', target_layer: 'no' }],
          },
        ],
      });
    } catch (error) {
      code = error instanceof PxError ? error.code : 'NOT_PX';
    }
    expect(code).toBe('E_NO_SUCH_LAYER');
  });
});
