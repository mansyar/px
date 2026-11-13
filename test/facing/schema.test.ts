import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import { FACING_UNIT_EPSILON } from '../../src/core/facing.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import { FACING_NAMES, type Part } from '../../src/core/recipe/types.js';
import { recipeOf, TONES } from './helpers.js';

/**
 * P1.T1 — `facing` in the schema.
 *
 * The frame is pinned in `src/core/facing.ts`; what is asserted here is that a
 * recipe can author every legal form, that the canonical writer round-trips both
 * forms byte for byte, and that the two error codes name what is wrong.
 */

function partOf(options: Parameters<typeof recipeOf>[0], name = 'body'): Part {
  const part = recipeOf(options).parts?.[name];
  if (part === undefined) {
    throw new Error(`part "${name}" was not normalised`);
  }
  return part;
}

function rejection(facing: unknown): PxError {
  try {
    recipeOf({ parts: { body: { material: 'steel', facing } } });
  } catch (error) {
    if (error instanceof PxError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected a PxError');
}

describe('facing names', () => {
  it.each(FACING_NAMES)('accepts %s and keeps it as a name', (name) => {
    const part = partOf({ parts: { body: { material: 'steel', facing: name } } });
    expect(part.facing).toBe(name);
  });

  it('leaves the field absent when it is not declared', () => {
    const part = partOf({ parts: { body: { material: 'steel' } } });
    expect(part.facing).toBeUndefined();
    expect('facing' in part).toBe(false);
  });

  it('defaults an undeclared part to viewer-facing rather than to a colour', () => {
    // The default is a direction ([0, 0, 1]), not a tone. A part without
    // `facing` is therefore skipped by the plane stage, not shaded as "front".
    const text = serializeRecipe(
      recipeOf({ parts: { body: { material: 'steel' }, wall: { material: 'steel' } } }),
    );
    expect(text).not.toContain('facing');
  });
});

describe('facing vectors', () => {
  it('accepts a unit vector and stores it as given', () => {
    const part = partOf({
      parts: { body: { material: 'steel', facing: [0, 0, 1] } },
    });
    expect(part.facing).toEqual([0, 0, 1]);
  });

  it('accepts a unit vector with a non-axis split', () => {
    const part = partOf({
      parts: { body: { material: 'steel', facing: [0.6, 0.8, 0] } },
    });
    expect(part.facing).toEqual([0.6, 0.8, 0]);
  });

  it('rejects a vector whose length is off by more than the epsilon', () => {
    const error = rejection([0, 1, 1]);
    expect(error.code).toBe('E_BAD_PARAM');
    expect(error.message).toContain('length');
    expect(error.message).toContain(String(FACING_UNIT_EPSILON));
    expect(error.hint).toContain('front');
  });

  it('accepts a vector exactly at the epsilon boundary', () => {
    const length = 1 + FACING_UNIT_EPSILON;
    const part = partOf({
      parts: { body: { material: 'steel', facing: [0, 0, length] } },
    });
    expect(part.facing).toEqual([0, 0, length]);
  });

  it('rejects the zero vector by name', () => {
    const error = rejection([0, 0, 0]);
    expect(error.code).toBe('E_BAD_PARAM');
    expect(error.message).toContain('zero facing vector');
    expect(error.hint).toContain('front');
  });

  it('rejects the wrong arity', () => {
    for (const value of [[0, 1], [0, 0, 0, 1], []]) {
      const error = rejection(value);
      expect(error.code).toBe('E_BAD_PARAM');
      expect(error.message).toContain('3-element vector');
    }
  });

  it('rejects a non-numeric component', () => {
    const error = rejection([0, 0, 'front']);
    expect(error.code).toBe('E_BAD_PARAM');
    expect(error.message).toContain('non-numeric');
  });
});

describe('facing errors', () => {
  it('names an unknown facing and lists the legal ones', () => {
    const error = rejection('sideways');
    expect(error.code).toBe('E_FACING_UNKNOWN');
    expect(error.message).toContain('"sideways"');
    expect(error.hint).toBe(
      'Facing is front, back, left, right, top, bottom, or a unit [x, y, z] vector.',
    );
  });

  it('rejects a case variant rather than guessing', () => {
    expect(rejection('Front').code).toBe('E_FACING_UNKNOWN');
  });

  it('rejects a bare number', () => {
    expect(rejection(3).code).toBe('E_BAD_PARAM');
  });
});

describe('facing serialisation', () => {
  it('round-trips a named facing unchanged', () => {
    const recipe = recipeOf({
      parts: {
        body: { material: 'steel', gloss: 'metal', z: 2, facing: 'right' },
        wall: { material: 'steel' },
      },
    });
    const text = serializeRecipe(recipe);
    expect(text).toContain('"facing": "right"');
    const again = serializeRecipe(parseRecipe(text).recipe);
    expect(again).toBe(text);
  });

  it('round-trips a vector facing unchanged', () => {
    const recipe = recipeOf({
      parts: { body: { material: 'clay', facing: [0.6, 0.8, 0] } },
      palette: TONES,
    });
    const text = serializeRecipe(recipe);
    expect(text).toContain('"facing": [\n        0.6,\n        0.8,\n        0\n      ]');
    expect(serializeRecipe(parseRecipe(text).recipe)).toBe(text);
  });

  it('writes facing after z, and only when declared', () => {
    const withFacing = serializeRecipe(
      recipeOf({ parts: { body: { material: 'steel', z: 1, facing: 'top' } } }),
    );
    expect(withFacing.indexOf('"z"')).toBeLessThan(withFacing.indexOf('"facing"'));
    const without = serializeRecipe(recipeOf({ parts: { body: { material: 'steel', z: 1 } } }));
    expect(without).not.toContain('facing');
  });
});
