/**
 * Recipe compilation: every layer's ops into its own slot buffer, then a single
 * flattened buffer for export and inspection. Warnings are collected per op, so
 * one clipped op reports once regardless of how many pixels fell outside.
 *
 * Layers are compiled in recipe order. A post-pass reads `target_layer` — by
 * default its own layer — as that layer stands when the op runs, which is why
 * the ordinary direction is a post-pass in a higher layer reading a lower one.
 *
 * Part ownership rides along in a parallel buffer. It changes no colour and no
 * byte of output; it only answers "which part owns this pixel" after the fact.
 */

import { SlotCanvas, UNOWNED } from './canvas.js';
import { PxError, type PxWarning } from './errors.js';
import { applyOp, type CleanupReport } from './ops/index.js';
import { buildSlotRoles, buildSlotTable, type SlotTable, TRANSPARENT_SLOT } from './palette.js';
import {
  type CompiledPart,
  flattenOwners,
  partHint,
  partIndex,
  partNames,
  partStats,
} from './parts.js';
import { profileFor, profileNumbers, type ScaleProfile } from './profile.js';
import { type Recipe, recipeParts } from './recipe/types.js';
import { resolveOpCoords } from './refs.js';

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
  /** One entry per declared part, in canonical name order; empty without parts. */
  parts: CompiledPart[];
  /** Part index per pixel, `UNOWNED` where nothing declared owns the pixel. */
  owners: Int16Array;
  /** The regime every size-sensitive number is read from: override, else canvas. */
  profile: ScaleProfile;
  /** One entry per cleanup pass that ran, in recipe order; absent when none ran. */
  cleanup?: CleanupReport[];
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

/** Mirrors MAX_FINDINGS_PER_CODE so a warm-up flood cannot bloat the envelope. */
const MAX_PART_WARNINGS = 50;

/** Why a cleanup pass had nothing to do, one hint per op. */
const CLEANUP_NOOP_HINTS: Record<CleanupReport['op'], string> = {
  seal: 'Enclose a gap first: only transparent holes of 2x2 pixels or smaller are sealed.',
  strays: 'Nothing in that layer is smaller than the cluster minimum for this profile.',
  deband:
    'Equal-width runs need three rows, and the darkest tone of a family has nowhere darker to go.',
};

function nameList(names: readonly string[]): string {
  if (names.length === 1) {
    return `part "${names[0]}"`;
  }
  const quoted = names.map((name) => `"${name}"`);
  const last = quoted.pop();
  return `parts ${quoted.join(', ')} and ${last}`;
}

export function compileRecipe(recipe: Recipe): CompiledRecipe {
  const { width, height } = recipe.meta;
  const slots = buildSlotTable(recipe.palette);
  const roles = buildSlotRoles(slots);
  const warnings: PxWarning[] = [];
  const declared = recipeParts(recipe);
  const names = partNames(declared);
  const indexes = partIndex(declared);
  const profile = recipe.meta.profile ?? profileFor(width, height);
  const numbers = profileNumbers(profile);
  const cleanup: CleanupReport[] = [];
  let cleanupNoops = 0;
  let partOverwrites = 0;

  const layers: CompiledLayer[] = recipe.layers.map((layer) => ({
    id: layer.id,
    canvas: new SlotCanvas(width, height),
  }));
  const byId = new Map(layers.map((layer) => [layer.id, layer.canvas]));
  const canvases = layers.map((layer) => layer.canvas);

  recipe.layers.forEach((layer, layerIndex) => {
    const target = layers[layerIndex];
    if (target === undefined) {
      return;
    }
    layer.ops.forEach((op, opIndex) => {
      target.canvas.clearClipped();
      if (op.part !== undefined && indexes.get(op.part) === undefined) {
        throw new PxError(
          'E_PART_UNKNOWN',
          `Op ${opIndex} (${op.op}) in layer "${layer.id}" names part "${op.part}", which is not declared`,
          partHint(names),
          { layer: layer.id, op_index: opIndex },
        );
      }
      if (op.op === 'light' && op.cast !== null && indexes.get(op.cast) === undefined) {
        throw new PxError(
          'E_PART_UNKNOWN',
          `Op ${opIndex} (light) in layer "${layer.id}" names caster part "${op.cast}", which is not declared`,
          partHint(names),
          { layer: layer.id, op_index: opIndex },
        );
      }
      const owner = op.part === undefined ? UNOWNED : (indexes.get(op.part) ?? UNOWNED);
      // Refs resolve here, before the op writes anything: the entry snapshot is
      // the layer state the op found, never geometry it is about to draw (FR-22).
      const resolved = resolveOpCoords(op, {
        layers: canvases,
        width,
        height,
        parts: declared,
        partIndexes: indexes,
        anchors: recipe.anchors,
        site: { layer: layer.id, opIndex, opName: op.op },
      });
      const outcome = applyOp(
        {
          canvas: target.canvas,
          layerId: layer.id,
          opIndex,
          slots,
          roles,
          layers: byId,
          owner,
          parts: declared,
          partIndexes: indexes,
          version: recipe.version,
          profile: numbers,
        },
        resolved,
      );
      if (outcome.clipped) {
        const detail = outcome.clippedDetail;
        const warning: PxWarning = {
          code: 'W_OUT_OF_BOUNDS',
          message:
            detail === undefined
              ? `Op ${opIndex} (${op.op}) of layer "${layer.id}" wrote outside the ${width}x${height} canvas and was clipped`
              : `Op ${opIndex} (${op.op}) of layer "${layer.id}" dropped ${detail.dropped} destination(s) outside the ${width}x${height} canvas`,
          hint: detail?.hint ?? `Keep coordinates within x 0-${width - 1} and y 0-${height - 1}.`,
          layer: layer.id,
          op_index: opIndex,
        };
        if (target.canvas.clippedAt !== null) {
          warning.coord = target.canvas.clippedAt;
        }
        warnings.push(warning);
      }
      if (target.canvas.displaced.length > 0) {
        partOverwrites += 1;
        if (partOverwrites <= MAX_PART_WARNINGS) {
          const displaced = target.canvas.displaced
            .map((index) => names[index])
            .filter((name): name is string => name !== undefined)
            .sort();
          const writer = op.part === undefined ? '' : ` as part "${op.part}"`;
          warnings.push({
            code: 'W_PART_OVERWRITE',
            message: `Op ${opIndex} (${op.op}) of layer "${layer.id}" repainted pixels owned by ${nameList(displaced)}${writer}`,
            hint: 'Order ops so each part finishes before the next one paints, or tag both ops with the same part.',
            layer: layer.id,
            op_index: opIndex,
          });
        }
      }
      if (outcome.cleanup !== undefined) {
        cleanup.push(outcome.cleanup);
        if (outcome.cleanup.changed === 0) {
          cleanupNoops += 1;
          if (cleanupNoops <= MAX_PART_WARNINGS) {
            warnings.push({
              code: 'W_CLEANUP_NOOP',
              message: `Op ${opIndex} (${op.op}) of layer "${layer.id}" changed no pixels`,
              hint: CLEANUP_NOOP_HINTS[outcome.cleanup.op],
              layer: layer.id,
              op_index: opIndex,
            });
          }
        }
      } else if (outcome.noop) {
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

  if (partOverwrites > MAX_PART_WARNINGS) {
    warnings.push({
      code: 'W_PART_OVERWRITE',
      message: `${partOverwrites} W_PART_OVERWRITE warnings; showing the first ${MAX_PART_WARNINGS}`,
      hint: 'Order ops so each part finishes before the next one paints, or tag both ops with the same part.',
    });
  }
  if (cleanupNoops > MAX_PART_WARNINGS) {
    warnings.push({
      code: 'W_CLEANUP_NOOP',
      message: `${cleanupNoops} cleanup ops changed no pixels; showing the first ${MAX_PART_WARNINGS}`,
      hint: 'A cleanup pass that cannot change anything is usually pointed at the wrong layer.',
    });
  }

  const owners = flattenOwners(layers.map((layer) => layer.canvas));
  const parts = partStats(width, height, owners, declared);
  const empty = parts.find((part) => part.painted === 0);
  if (empty !== undefined) {
    throw new PxError(
      'E_EMPTY_PART',
      `Part "${empty.name}" is declared but owns no pixels`,
      `Paint at least one pixel with "part": "${empty.name}", or remove the declaration from "parts".`,
    );
  }

  return {
    width,
    height,
    slots,
    layers,
    flattened: flattenLayers(layers, width, height),
    parts,
    owners,
    profile,
    ...(cleanup.length > 0 ? { cleanup } : {}),
    warnings,
  };
}
