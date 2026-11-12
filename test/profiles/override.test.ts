/**
 * `meta.profile` is the only way a recipe overrides its derived regime. These
 * tests pin the two halves of that (FR-14): an unknown name is an error that
 * lists the names, and a name that disagrees with the canvas is a single warning
 * that keeps the override. Serialization stays byte-identical when it is absent.
 */

import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';

interface RecipeBody {
  name?: string;
  width: number;
  height: number;
  profile?: string;
}

function recipeText(body: RecipeBody): string {
  const meta: Record<string, unknown> = {
    name: body.name ?? 'profile',
    width: body.width,
    height: body.height,
    alpha_mode: 'binary',
  };
  if (body.profile !== undefined) {
    meta.profile = body.profile;
  }
  return `${JSON.stringify({
    version: 1,
    meta,
    palette: { main: { colors: ['#000000'] } },
    anchors: {},
    layers: [
      {
        id: 'base',
        ops: [{ op: 'rect', x: 0, y: 0, w: 4, h: 4, color: 'main.0' }],
      },
    ],
  })}\n`;
}

describe('the derived profile on the canonical recipe', () => {
  it('follows the canvas when the recipe says nothing', () => {
    for (const [size, expected] of [
      [16, 'tiny'],
      [32, 'small'],
      [64, 'medium'],
      [256, 'large'],
    ] as const) {
      const parsed = parseRecipe(recipeText({ width: size, height: size }));
      expect(parsed.recipe.meta.profile).toBeUndefined();
      expect(compileRecipe(parsed.recipe).profile).toBe(expected);
    }
  });

  it('lets the recipe override the canvas', () => {
    const parsed = parseRecipe(recipeText({ width: 32, height: 32, profile: 'large' }));
    expect(parsed.recipe.meta.profile).toBe('large');
    expect(compileRecipe(parsed.recipe).profile).toBe('large');
  });

  it('warns once, naming both, when the override disagrees with the canvas', () => {
    const parsed = parseRecipe(recipeText({ width: 32, height: 32, profile: 'large' }));
    expect(parsed.warnings).toHaveLength(1);
    const warning = parsed.warnings[0];
    expect(warning?.code).toBe('W_PROFILE_MISMATCH');
    expect(warning?.message).toContain('"large"');
    expect(warning?.message).toContain('32x32');
    expect(warning?.message).toContain('"small"');
    expect(warning?.hint).toContain('Remove "profile"');
  });

  it('stays silent when the override agrees with the canvas', () => {
    const parsed = parseRecipe(recipeText({ width: 32, height: 32, profile: 'small' }));
    expect(parsed.warnings).toEqual([]);
  });

  it('rejects an unknown name and lists the accepted ones', () => {
    let caught: unknown;
    try {
      parseRecipe(recipeText({ width: 32, height: 32, profile: 'huge' }));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PxError);
    const error = caught as PxError;
    expect(error.code).toBe('E_PROFILE_UNKNOWN');
    expect(error.message).toContain('"huge"');
    expect(error.hint).toContain('tiny, small, medium, large');
  });
});

describe('canonical serialization', () => {
  it('writes profile only when the recipe declared it', () => {
    const absent = parseRecipe(recipeText({ width: 32, height: 32 }));
    const written = JSON.parse(serializeRecipe(absent.recipe)) as {
      meta: Record<string, unknown>;
    };
    expect('profile' in written.meta).toBe(false);
    expect(Object.keys(written.meta)).toEqual(['name', 'width', 'height', 'alpha_mode']);

    const declared = parseRecipe(recipeText({ width: 32, height: 32, profile: 'large' }));
    const declaredWritten = JSON.parse(serializeRecipe(declared.recipe)) as {
      meta: Record<string, unknown>;
    };
    expect(Object.keys(declaredWritten.meta)).toEqual([
      'name',
      'width',
      'height',
      'alpha_mode',
      'profile',
    ]);
    expect(declaredWritten.meta.profile).toBe('large');
  });

  it('round-trips a profile recipe byte for byte', () => {
    const first = serializeRecipe(parseRecipe(recipeText({ width: 64, height: 64 })).recipe);
    const second = serializeRecipe(parseRecipe(first).recipe);
    expect(second).toBe(first);

    const declared = recipeText({ width: 64, height: 64, profile: 'large' });
    const once = serializeRecipe(parseRecipe(declared).recipe);
    expect(serializeRecipe(parseRecipe(once).recipe)).toBe(once);
  });
});
