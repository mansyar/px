/**
 * Render pipeline: recipe to PNG bytes, plus the intermediates the CLI reports.
 */

import { createHash } from 'node:crypto';
import { type CompiledRecipe, compileRecipe } from '../core/compile.js';
import type { PxWarning } from '../core/errors.js';
import type { Recipe } from '../core/recipe/types.js';
import { rasterizeSlots } from './flatten.js';
import { encodePng } from './png.js';

export interface RenderResult {
  png: Uint8Array;
  rgba: Uint8Array;
  width: number;
  height: number;
  compiled: CompiledRecipe;
  warnings: PxWarning[];
}

export function renderRecipe(recipe: Recipe): RenderResult {
  const compiled = compileRecipe(recipe);
  const rgba = rasterizeSlots(compiled.flattened, compiled.width, compiled.height, compiled.slots);
  const png = encodePng(compiled.width, compiled.height, rgba);
  return {
    png,
    rgba,
    width: compiled.width,
    height: compiled.height,
    compiled,
    warnings: compiled.warnings,
  };
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
