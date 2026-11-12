/**
 * Validation that needs the resolved palette: every colour named by an op must
 * be a declared slot, and every `target_layer` must exist. Called after
 * normalization, so shapes are already sound.
 */

import { PxError } from '../errors.js';
import { type SlotTable, slotHint } from '../palette.js';
import type { Op, Recipe } from './types.js';

/** Slot names an op references, in the order it references them. */
function slotReferences(op: Op): string[] {
  switch (op.op) {
    case 'set_pixels':
    case 'rect':
    case 'line':
    case 'ellipse':
    case 'polygon':
    case 'flood_fill':
    case 'dither_fill':
      return op.color === null ? [] : [op.color];
    case 'auto_outline':
      return typeof op.color === 'string' ? [op.color] : [];
    case 'ascii_blit':
      return Object.values(op.legend);
    case 'replace_slot':
      return [op.from, op.to];
    case 'mirror':
    case 'auto_shade':
    case 'ramp_fill':
      return [];
  }
}

export function validateReferences(recipe: Recipe, slots: SlotTable): void {
  const layerIds = new Set(recipe.layers.map((layer) => layer.id));
  for (const layer of recipe.layers) {
    layer.ops.forEach((op, opIndex) => {
      for (const name of slotReferences(op)) {
        if (slots.resolve(name) === undefined) {
          throw new PxError(
            'E_UNKNOWN_SLOT',
            `Unknown slot "${name}" in op ${opIndex} of layer "${layer.id}"`,
            slotHint(name, slots),
            { layer: layer.id, op_index: opIndex },
          );
        }
      }
      const target =
        op.op === 'auto_outline' || op.op === 'auto_shade' || op.op === 'ramp_fill'
          ? op.targetLayer
          : undefined;
      if (target !== undefined && !layerIds.has(target)) {
        throw new PxError(
          'E_NO_SUCH_LAYER',
          `Op ${opIndex} (${op.op}) in layer "${layer.id}" reads target_layer "${target}", which does not exist`,
          `Layers are ${recipe.layers.map((entry) => entry.id).join(', ') || 'none'}.`,
          { layer: layer.id, op_index: opIndex },
        );
      }
    });
  }
}
