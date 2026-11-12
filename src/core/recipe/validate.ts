/**
 * Validation that needs the resolved palette: every colour named by an op must
 * be a declared slot. Called after normalization, so shapes are already sound.
 */

import { PxError } from '../errors.js';
import type { SlotTable } from '../palette.js';
import type { Recipe } from './types.js';

function slotHint(slot: string, slots: SlotTable): string {
  const separator = slot.lastIndexOf('.');
  const familyName = separator === -1 ? slot : slot.slice(0, separator);
  const family = slots.families.find((entry) => entry.name === familyName);
  if (family !== undefined) {
    const roles = family.slots.map((name) => name.slice(familyName.length + 1));
    return `Family "${familyName}" defines ${roles.join(', ')}.`;
  }
  const known = slots.familyNames.join(', ');
  return known === ''
    ? 'The palette declares no families; add one before drawing.'
    : `Palette defines ${known}.`;
}

export function validateSlots(recipe: Recipe, slots: SlotTable): void {
  for (const layer of recipe.layers) {
    layer.ops.forEach((op, opIndex) => {
      if (slots.resolve(op.color) === undefined) {
        throw new PxError(
          'E_UNKNOWN_SLOT',
          `Unknown slot "${op.color}" in op ${opIndex} of layer "${layer.id}"`,
          slotHint(op.color, slots),
          { layer: layer.id, op_index: opIndex },
        );
      }
    });
  }
}
