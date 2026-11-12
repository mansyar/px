/**
 * Canonical serialization.
 *
 * The writer is the contract hand-editing relies on: fixed key order, expanded
 * objects, two-space indent, LF, one trailing newline. A recipe that survives a
 * read-write cycle is byte-identical to what was read.
 */

import { type Anchors, type Op, type Palette, RAMP_ROLES, type Recipe } from './types.js';

function canonicalMeta(recipe: Recipe): Record<string, unknown> {
  return {
    name: recipe.meta.name,
    width: recipe.meta.width,
    height: recipe.meta.height,
    alpha_mode: recipe.meta.alphaMode,
  };
}

function canonicalPalette(palette: Palette): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const name of Object.keys(palette).sort()) {
    const family = palette[name];
    if ('ramp' in family) {
      const ramp: Record<string, string> = {};
      for (const role of RAMP_ROLES) {
        const value = family.ramp[role];
        if (value !== undefined) {
          ramp[role] = value;
        }
      }
      out[name] = { ramp };
    } else {
      out[name] = { colors: [...family.colors] };
    }
  }
  return out;
}

function canonicalAnchors(anchors: Anchors): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const name of Object.keys(anchors).sort()) {
    const [x, y] = anchors[name];
    out[name] = [x, y];
  }
  return out;
}

/** Drop absent optionals so the written form never carries `undefined`. */
function defined(entries: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

/** Parameters in `OP_PARAM_ORDER` order. `id` is added by the caller, first. */
function opParams(op: Op): Record<string, unknown> {
  switch (op.op) {
    case 'set_pixels':
      return {
        points: op.points.map(([x, y]) => [x, y]),
        color: op.color,
      };
    case 'rect':
      return { x: op.x, y: op.y, w: op.w, h: op.h, color: op.color };
    case 'line':
      return { x1: op.x1, y1: op.y1, x2: op.x2, y2: op.y2, color: op.color };
    case 'ellipse':
      return defined({
        x: op.x,
        y: op.y,
        w: op.w,
        h: op.h,
        color: op.color,
        fill: op.fill === true ? true : undefined,
      });
    case 'polygon':
      return {
        points: op.points.map(([x, y]) => [x, y]),
        color: op.color,
      };
    case 'flood_fill':
      return defined({
        x: op.x,
        y: op.y,
        color: op.color,
        connectivity: op.connectivity,
      });
    case 'dither_fill':
      return { x: op.x, y: op.y, w: op.w, h: op.h, color: op.color, pattern: op.pattern };
    case 'ascii_blit':
      return { x: op.x, y: op.y, grid: [...op.grid], legend: { ...op.legend } };
    case 'mirror':
      return { axis: op.axis, pivot: op.pivot };
    case 'auto_outline':
      return defined({
        mode: op.mode,
        where: op.where,
        color: op.color,
        selective: op.selective,
        target_layer: op.targetLayer,
      });
    case 'auto_shade':
      return defined({ light_dir: op.lightDir, target_layer: op.targetLayer });
    case 'ramp_fill':
      return defined({ bands: op.bands, light_dir: op.lightDir, target_layer: op.targetLayer });
    case 'replace_slot':
      return { from: op.from, to: op.to };
  }
}

export function canonicalOp(op: Op): Record<string, unknown> {
  const out: Record<string, unknown> = { op: op.op };
  if (op.id !== undefined) {
    out.id = op.id;
  }
  return Object.assign(out, opParams(op));
}

export function canonicalRecipe(recipe: Recipe): Record<string, unknown> {
  return {
    version: recipe.version,
    meta: canonicalMeta(recipe),
    palette: canonicalPalette(recipe.palette),
    anchors: canonicalAnchors(recipe.anchors),
    layers: recipe.layers.map((layer) => ({
      id: layer.id,
      ops: layer.ops.map((op) => canonicalOp(op)),
    })),
  };
}

export function serializeRecipe(recipe: Recipe): string {
  return `${JSON.stringify(canonicalRecipe(recipe), null, 2)}\n`;
}
