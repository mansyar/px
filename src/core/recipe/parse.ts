/**
 * Recipe entry point: JSON text in, validated recipe plus warnings out.
 */

import { type ResolvedDesign, resolveDesign, validateIntent } from '../design.js';
import { causeMessage, PxError, type PxWarning } from '../errors.js';
import { buildSlotTable, type SlotTable } from '../palette.js';
import { normalizeRecipe } from './normalize.js';
import type { Recipe } from './types.js';
import { type ValidateOptions, validateReferences } from './validate.js';

export interface ParseResult {
  recipe: Recipe;
  slots: SlotTable;
  warnings: PxWarning[];
  /** Resolved design intent and its style, when the recipe declares one. */
  design?: ResolvedDesign;
}

/** Everything validation may need that the recipe text does not carry. */
export type ParseOptions = ValidateOptions & {
  /**
   * Directory used to resolve an inherited style file. CLI and MCP pass the
   * recipe directory explicitly so resolution never depends on ambient cwd.
   */
  baseDir?: string;
};

export function parseRecipe(text: string, options: ParseOptions = {}): ParseResult {
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

  // The resolver is a closure so the resolved style stays attached to this
  // single parse call; nothing is cached globally, so two callers with
  // different base directories cannot influence each other.
  let resolvedDesign: ResolvedDesign | undefined;
  const { recipe, warnings } = normalizeRecipe(raw, {
    resolveDesign: (design) => {
      resolvedDesign = resolveDesign(design, options.baseDir ?? process.cwd());
      return resolvedDesign.design;
    },
  });
  if (resolvedDesign !== undefined) validateIntent(recipe, resolvedDesign);
  const slots = buildSlotTable(recipe.palette);
  validateReferences(recipe, slots, options);
  return {
    recipe,
    slots,
    warnings,
    ...(resolvedDesign === undefined ? {} : { design: resolvedDesign }),
  };
}
