import { describe, expect, it } from 'vitest';
import { facingRole, towardLight } from '../../src/core/ops/light.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import { codeOf, errorOf, parsed } from './helpers.js';

const BODY = { body: { material: 'steel' } };

function lightOf(extra: Record<string, unknown>) {
  const recipe = parsed({ parts: BODY, ops: [{ op: 'light', ...extra }] });
  return recipe.layers[0]?.ops[0];
}

describe('light light-vector convention', () => {
  it('points toward the named corner and throws the shadow the other way', () => {
    expect(towardLight('top-left')).toEqual([-1, -1]);
    expect(towardLight('top-right')).toEqual([1, -1]);
    expect(towardLight('bottom-left')).toEqual([-1, 1]);
    expect(towardLight('bottom-right')).toEqual([1, 1]);
  });

  it('reads a positive dot as lit, a negative one as dark, zero as unchanged', () => {
    expect(facingRole(1)).toBe('highlight');
    expect(facingRole(-1)).toBe('shadow');
    expect(facingRole(0)).toBeUndefined();
  });
});

describe('light op shape', () => {
  it('defaults to a top-left bevel with occlusion, no cast and an edge rim', () => {
    expect(lightOf({})).toEqual({
      op: 'light',
      angle: 'top-left',
      form: 'bevel',
      ao: true,
      cast: null,
      castOffset: 1,
      rim: 'edge',
    });
  });

  it('keeps every documented value when written explicitly', () => {
    expect(
      lightOf({
        angle: 'bottom-right',
        form: 'round',
        ao: false,
        cast: 'body',
        cast_offset: 4,
        rim: 'selective',
        target_layer: 'base',
      }),
    ).toEqual({
      op: 'light',
      angle: 'bottom-right',
      form: 'round',
      ao: false,
      cast: 'body',
      castOffset: 4,
      rim: 'selective',
      targetLayer: 'base',
    });
  });

  it('accepts all four corners, all three forms and all three rim modes', () => {
    for (const angle of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
      expect(lightOf({ angle })).toMatchObject({ angle });
    }
    for (const form of ['flat', 'bevel', 'round']) {
      expect(lightOf({ form })).toMatchObject({ form });
    }
    for (const rim of ['none', 'edge', 'selective']) {
      expect(lightOf({ rim })).toMatchObject({ rim });
    }
  });

  it('rejects a value outside a closed set, naming the alternatives', () => {
    for (const [key, value] of [
      ['angle', 'north'],
      ['form', 'soft'],
      ['rim', 'hard'],
    ] as const) {
      const error = errorOf(() => lightOf({ [key]: value }));
      expect(error.code).toBe('E_BAD_PARAM');
      expect(error.message).toContain(key);
    }
  });

  it('rejects a cast_offset outside 1-4 or not an integer, naming the range', () => {
    for (const value of [0, 5, -1, 2.5, '2', null]) {
      const error = errorOf(() => lightOf({ cast_offset: value }));
      expect(error.code).toBe('E_BAD_PARAM');
      expect(`${error.message} ${error.hint}`).toContain('1');
      expect(`${error.message} ${error.hint}`).toContain('4');
    }
    expect(lightOf({ cast_offset: 1 })).toMatchObject({ castOffset: 1 });
    expect(lightOf({ cast_offset: 4 })).toMatchObject({ castOffset: 4 });
  });

  it('rejects a caster that is not declared, listing the declared parts', () => {
    const error = errorOf(() => lightOf({ cast: 'ghost' }));
    expect(error.code).toBe('E_PART_UNKNOWN');
    expect(error.message).toContain('ghost');
    expect(error.hint).toContain('body');
  });

  it('rejects cast on a recipe with no parts at all', () => {
    const error = errorOf(() =>
      parsed({
        ops: [
          { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'steel.base' },
          { op: 'light', cast: 'body' },
        ],
      }),
    );
    expect(error.code).toBe('E_PART_UNKNOWN');
    expect(error.hint).toContain('Declare parts first');
  });

  it('does not accept part: ownership comes from the layer it reads', () => {
    const error = errorOf(() => lightOf({ part: 'body' }));
    expect(error.code).toBe('E_BAD_PARAM');
    expect(error.message).toContain('part');
  });

  it('rejects an unknown key like every other op', () => {
    const error = errorOf(() => lightOf({ halo: true }));
    expect(error.code).toBe('E_BAD_PARAM');
    expect(error.message).toContain('halo');
  });

  it('rejects a target_layer that does not exist', () => {
    expect(codeOf(() => lightOf({ target_layer: 'ghost' }))).toBe('E_NO_SUCH_LAYER');
  });

  it('round-trips through the canonical serializer with every field explicit', () => {
    const recipe = parsed({
      parts: BODY,
      ops: [{ op: 'light', angle: 'top-right', cast: 'body', cast_offset: 2 }],
    });
    const text = serializeRecipe(recipe);
    for (const line of [
      '"angle": "top-right"',
      '"form": "bevel"',
      '"ao": true',
      '"cast": "body"',
      '"cast_offset": 2',
      '"rim": "edge"',
    ]) {
      expect(text).toContain(line);
    }
    const again = parseRecipe(text).recipe;
    expect(again).toEqual(recipe);
    expect(serializeRecipe(again)).toBe(text);
  });

  it('writes cast: null rather than dropping it', () => {
    const text = serializeRecipe(parsed({ parts: BODY, ops: [{ op: 'light' }] }));
    expect(text).toContain('"cast": null');
    expect(parseRecipe(text).recipe.layers[0]?.ops[0]).toMatchObject({ cast: null });
  });
});
