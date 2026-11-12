/**
 * Recipe compilation: every layer's ops into its own slot buffer, then a single
 * flattened buffer for export and inspection. Warnings are collected per op, so
 * one clipped op reports once regardless of how many pixels fell outside.
 *
 * Layers are compiled in recipe order. A post-pass reads `target_layer` — by
 * default its own layer — as that layer stands when the op runs, which is why
 * the ordinary direction is a post-pass in a higher layer reading a lower one.
 */

import { SlotCanvas } from './canvas.js';
import type { PxWarning } from './errors.js';
import { applyOp } from './ops/index.js';
import { buildSlotRoles, buildSlotTable, type SlotTable, TRANSPARENT_SLOT } from './palette.js';
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
  const roles = buildSlotRoles(slots);
  const warnings: PxWarning[] = [];

  const layers: CompiledLayer[] = recipe.layers.map((layer) => ({
    id: layer.id,
    canvas: new SlotCanvas(width, height),
  }));
  const byId = new Map(layers.map((layer) => [layer.id, layer.canvas]));

  recipe.layers.forEach((layer, layerIndex) => {
    const target = layers[layerIndex];
    if (target === undefined) {
      return;
    }
    layer.ops.forEach((op, opIndex) => {
      target.canvas.clearClipped();
      const outcome = applyOp(
        {
          canvas: target.canvas,
          layerId: layer.id,
          opIndex,
          slots,
          roles,
          layers: byId,
        },
        op,
      );
      if (outcome.clipped) {
        const warning: PxWarning = {
          code: 'W_OUT_OF_BOUNDS',
          message: `Op ${opIndex} (${op.op}) of layer "${layer.id}" wrote outside the ${width}x${height} canvas and was clipped`,
          hint: `Keep coordinates within x 0-${width - 1} and y 0-${height - 1}.`,
          layer: layer.id,
          op_index: opIndex,
        };
        if (target.canvas.clippedAt !== null) {
          warning.coord = target.canvas.clippedAt;
        }
        warnings.push(warning);
      }
      if (outcome.noop) {
        warnings.push({
          code: 'W_PASS_NOOP',
          message: `Op ${opIndex} (${op.op}) of layer "${layer.id}" changed no pixels`,
          hint: 'Draw into the layer it reads first, or point target_layer at a layer that has content.',
          layer: layer.id,
          op_index: opIndex,
        });
      }
    });
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
