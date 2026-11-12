/**
 * Validation that needs the resolved palette: every colour named by an op must
 * be a declared slot, every `target_layer` must exist, and every part reference
 * must resolve. Called after normalization, so shapes are already sound.
 */

import { PxError } from '../errors.js';
import { type SlotTable, slotHint } from '../palette.js';
import { type Op, type Recipe, recipeParts } from './types.js';

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
    case 'light':
    case 'seal':
    case 'strays':
    case 'deband':
      return [];
  }
}

function unknownPartHint(declared: string[]): string {
  return declared.length === 0
    ? 'Declare parts first, e.g. "parts": {"blade": {"material": "steel"}}.'
    : `Declared parts are ${declared.join(', ')}.`;
}

export function validateReferences(recipe: Recipe, slots: SlotTable): void {
  const layerIds = new Set(recipe.layers.map((layer) => layer.id));
  const parts = recipeParts(recipe);
  const declared = Object.keys(parts).sort();

  for (const [name, part] of Object.entries(parts)) {
    if (!slots.familyNames.includes(part.material)) {
      throw new PxError(
        'E_MATERIAL_UNKNOWN',
        `Part "${name}" uses material "${part.material}", which is not a palette family`,
        slots.familyNames.length === 0
          ? 'The palette declares no families; add one before declaring a part.'
          : `Palette families are ${slots.familyNames.join(', ')}.`,
      );
    }
  }

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
      if (op.part !== undefined && parts[op.part] === undefined) {
        throw new PxError(
          'E_PART_UNKNOWN',
          `Op ${opIndex} (${op.op}) in layer "${layer.id}" names part "${op.part}", which is not declared`,
          unknownPartHint(declared),
          { layer: layer.id, op_index: opIndex },
        );
      }
      if (op.op === 'light' && op.cast !== null && parts[op.cast] === undefined) {
        throw new PxError(
          'E_PART_UNKNOWN',
          `Op ${opIndex} (light) in layer "${layer.id}" names caster part "${op.cast}", which is not declared`,
          unknownPartHint(declared),
          { layer: layer.id, op_index: opIndex },
        );
      }
      const target =
        op.op === 'auto_outline' ||
        op.op === 'auto_shade' ||
        op.op === 'ramp_fill' ||
        op.op === 'light' ||
        op.op === 'seal' ||
        op.op === 'strays' ||
        op.op === 'deband'
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
