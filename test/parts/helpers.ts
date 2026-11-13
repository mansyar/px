/**
 * Shared fixtures for the parts suite. Recipes here are 1.1 by default; pass
 * `version` to exercise the 1.0 compatibility path.
 */

import { PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Recipe } from '../../src/core/recipe/types.js';

export interface RecipeOptions {
  [key: string]: unknown;
}

/** A 1.1 recipe with one two-family palette and one declared part. */
export function recipeText(overrides: RecipeOptions = {}): string {
  return JSON.stringify(
    {
      version: '1.1',
      meta: { name: 'test', width: 8, height: 8, alpha_mode: 'binary' },
      palette: {
        steel: {
          ramp: {
            outline: '#11151c',
            shadow: '#333a44',
            base: '#7d8a9a',
            highlight: '#c8d4e0',
          },
        },
        leather: { ramp: { t0: '#4a2f1b', t1: '#8a5a30' } },
      },
      parts: { blade: { material: 'steel' } },
      anchors: {},
      layers: [{ id: 'base', ops: [] }],
      ...overrides,
    },
    null,
    2,
  );
}

export function parseText(text: string): Recipe {
  return parseRecipe(text).recipe;
}

/** The `PxError` a thunk throws, or a failure naming what was expected. */
export function codeOf(run: () => unknown): PxError {
  try {
    run();
  } catch (error) {
    if (error instanceof PxError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a PxError, but the call succeeded');
}

export function opOf(recipe: Recipe, layerIndex = 0, opIndex = 0) {
  return recipe.layers[layerIndex]?.ops[opIndex];
}
