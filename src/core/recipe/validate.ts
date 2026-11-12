/**
 * Validation that needs the resolved palette: every colour named by an op must
 * be a declared slot, every `target_layer` must exist, and every part reference
 * must resolve. Called after normalization, so shapes are already sound.
 */

import { PxError } from '../errors.js';
import { partRampError } from '../ops/pass.js';
import { buildSlotRoles, type SlotTable, slotHint } from '../palette.js';
import { coordRefsOf, parseRef } from '../refs.js';
import { RAMP_ROLES, type RawOp, type Recipe, recipeParts } from './types.js';

/** Slot names an op references, in the order it references them. */
function slotReferences(op: RawOp): string[] {
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
  const roles = buildSlotRoles(slots);

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
    // A declared part promises it can be shaded, so its material must resolve
    // every shading role now rather than failing later inside a pass (FR-5,
    // AC-5). `outline` is not required: selective rim and edges fall back to the
    // explicit colour when a family has none (AC-9).
    const familyIndex = slots.familyNames.indexOf(part.material);
    for (const role of RAMP_ROLES) {
      if (role === 'outline') {
        continue;
      }
      if (roles.roleSlots[familyIndex]?.[role] === undefined) {
        throw partRampError(name, part.material, role);
      }
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
      for (const ref of coordRefsOf(op)) {
        const target = parseRef(ref.ref, { layer: layer.id, opIndex, opName: op.op });
        const location = { layer: layer.id, op_index: opIndex };
        if (target.kind === 'part' && parts[target.part] === undefined) {
          throw new PxError(
            'E_PART_UNKNOWN',
            `Coordinate ref "${ref.ref}" in op ${opIndex} (${op.op}) of layer "${layer.id}" names part "${target.part}", which is not declared`,
            unknownPartHint(declared),
            location,
          );
        }
        if (target.kind === 'anchor' && recipe.anchors[target.name] === undefined) {
          const anchors = Object.keys(recipe.anchors).sort();
          throw new PxError(
            'E_BAD_PARAM',
            `Coordinate ref "${ref.ref}" in op ${opIndex} (${op.op}) of layer "${layer.id}" names anchor "${target.name}", which is not declared`,
            anchors.length === 0
              ? 'This recipe declares no anchors; add one with `px anchor --name ...`.'
              : `Declared anchors are ${anchors.join(', ')}.`,
            location,
          );
        }
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
