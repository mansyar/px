/**
 * Canonical serialization.
 *
 * The writer is the contract hand-editing relies on: fixed key order, expanded
 * objects, two-space indent, LF, one trailing newline. A recipe that survives a
 * read-write cycle is byte-identical to what was read.
 */

import { type Op, type Palette, RAMP_ROLES, type Recipe } from './types.js';

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

function canonicalAnchors(recipe: Recipe): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const name of Object.keys(recipe.anchors).sort()) {
    const [x, y] = recipe.anchors[name];
    out[name] = [x, y];
  }
  return out;
}

export function canonicalOp(op: Op): Record<string, unknown> {
  switch (op.op) {
    case 'set_pixels':
      return {
        op: 'set_pixels',
        points: op.points.map(([x, y]) => [x, y]),
        color: op.color,
      };
    case 'rect':
      return {
        op: 'rect',
        x: op.x,
        y: op.y,
        w: op.w,
        h: op.h,
        color: op.color,
      };
    case 'line': {
      const value: Record<string, unknown> = {
        op: 'line',
        x1: op.x1,
        y1: op.y1,
        x2: op.x2,
        y2: op.y2,
        color: op.color,
      };
      if (op.pixelPerfect === true) {
        value.pixel_perfect = true;
      }
      return value;
    }
  }
}

export function canonicalRecipe(recipe: Recipe): Record<string, unknown> {
  return {
    version: recipe.version,
    meta: canonicalMeta(recipe),
    palette: canonicalPalette(recipe.palette),
    anchors: canonicalAnchors(recipe),
    layers: recipe.layers.map((layer) => ({
      id: layer.id,
      ops: layer.ops.map((op) => canonicalOp(op)),
    })),
  };
}

export function serializeRecipe(recipe: Recipe): string {
  return `${JSON.stringify(canonicalRecipe(recipe), null, 2)}\n`;
}
