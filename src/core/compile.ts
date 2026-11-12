/**
 * Recipe compilation: every layer's ops into its own slot buffer, then a single
 * flattened buffer for export and inspection. Warnings are collected per op, so
 * one clipped op reports once regardless of how many pixels fell outside.
 */

import { SlotCanvas } from './canvas.js';
import { PxError, type PxWarning } from './errors.js';
import { applyOp } from './ops/index.js';
import { buildSlotTable, type SlotTable, TRANSPARENT_SLOT } from './palette.js';
import type { Recipe } from './recipe/types.js';

export interface CompiledLayer {
  id: string;
  canvas: SlotCanvas;
}

export interface CompiledRecipe {
  width: number;
  height: number;
  slots: SlotTable;
  layers: CompiledLayer[];
  flattened: Int16Array;
  warnings: PxWarning[];
}

export function flattenLayers(
  layers: readonly CompiledLayer[],
  width: number,
  height: number,
): Int16Array {
  const flattened = new Int16Array(width * height).fill(TRANSPARENT_SLOT);
  for (const layer of layers) {
    const source = layer.canvas.slots;
    for (let index = 0; index < source.length; index += 1) {
      if (source[index] !== TRANSPARENT_SLOT) {
        flattened[index] = source[index];
      }
    }
  }
  return flattened;
}

export function compileRecipe(recipe: Recipe): CompiledRecipe {
  const { width, height } = recipe.meta;
  const slots = buildSlotTable(recipe.palette);
  const warnings: PxWarning[] = [];

  const layers: CompiledLayer[] = recipe.layers.map((layer) => {
    const target: CompiledLayer = { id: layer.id, canvas: new SlotCanvas(width, height) };
    layer.ops.forEach((op, opIndex) => {
      const slot = slots.resolve(op.color);
      if (slot === undefined) {
        throw new PxError(
          'E_UNKNOWN_SLOT',
          `Unknown slot "${op.color}" in op ${opIndex} of layer "${layer.id}"`,
          'Declare the slot in the palette before compiling.',
          { layer: layer.id, op_index: opIndex },
        );
      }
      const clipped = applyOp(target.canvas, op, slot);
      if (clipped) {
        warnings.push({
          code: 'W_OUT_OF_BOUNDS',
          message: `Op ${opIndex} (${op.op}) of layer "${layer.id}" wrote outside the ${width}x${height} canvas and was clipped`,
          hint: `Keep coordinates within x 0-${width - 1} and y 0-${height - 1}.`,
          layer: layer.id,
          op_index: opIndex,
        });
      }
    });
    return target;
  });

  return {
    width,
    height,
    slots,
    layers,
    flattened: flattenLayers(layers, width, height),
    warnings,
  };
}
