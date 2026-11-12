/**
 * Recipe entry point: JSON text in, validated recipe plus warnings out.
 */

import { causeMessage, PxError, type PxWarning } from '../errors.js';
import { buildSlotTable, type SlotTable } from '../palette.js';
import { normalizeRecipe } from './normalize.js';
import type { Recipe } from './types.js';
import { validateReferences } from './validate.js';

export interface ParseResult {
  recipe: Recipe;
  slots: SlotTable;
  warnings: PxWarning[];
}

export function parseRecipe(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (cause) {
    throw new PxError(
      'E_PARSE',
      `Recipe is not valid JSON: ${causeMessage(cause)}`,
      'Check for a trailing comma, a missing quote, or an unquoted key.',
    );
  }

  const { recipe, warnings } = normalizeRecipe(raw);
  const slots = buildSlotTable(recipe.palette);
  validateReferences(recipe, slots);
  return { recipe, slots, warnings };
}
