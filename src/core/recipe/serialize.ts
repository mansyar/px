/**
 * Canonical serialization.
 *
 * The writer is the contract hand-editing relies on: fixed key order, expanded
 * objects, two-space indent, LF, one trailing newline. A recipe that survives a
 * read-write cycle is byte-identical to what was read.
 */

import {
  type Anchors,
  type Coord,
  type Palette,
  type Parts,
  RAMP_ROLES,
  type RawOp,
  type Recipe,
  rampTones,
  recipeParts,
} from './types.js';

function canonicalMeta(recipe: Recipe): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    name: recipe.meta.name,
    width: recipe.meta.width,
    height: recipe.meta.height,
    alpha_mode: recipe.meta.alphaMode,
  };
  // Written only when declared, so a recipe that never named a profile keeps its
  // exact bytes through a read-write cycle (FR-1).
  if (recipe.meta.profile !== undefined) {
    meta.profile = recipe.meta.profile;
  }
  return meta;
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
      for (const tone of rampTones(family.ramp)) {
        const value = family.ramp[`t${tone}`];
        if (value !== undefined) {
          ramp[`t${tone}`] = value;
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

/**
 * Parts sorted by name, each writing `material`, then `gloss` (always, so a
 * matte part stays explicit), then `z` only when it is not zero, then `facing`
 * only when declared. A part without a facing writes exactly the bytes it wrote
 * before the field existed, which is what keeps older recipes byte-identical.
 */
function canonicalParts(parts: Parts): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const name of Object.keys(parts).sort()) {
    const part = parts[name];
    if (part === undefined) {
      continue;
    }
    const entry: Record<string, unknown> = { material: part.material, gloss: part.gloss };
    if (part.z !== 0) {
      entry.z = part.z;
    }
    if (part.facing !== undefined) {
      // Names stay names and vectors stay vectors, so both forms round-trip.
      entry.facing = Array.isArray(part.facing) ? [...part.facing] : part.facing;
    }
    out[name] = entry;
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

/**
 * A coordinate as the recipe stores it. Refs keep their key order (`ref`, `dx`,
 * `dy`) and drop zero offsets the way every other default is dropped, so a ref
 * recipe is byte-identical after a read-write cycle.
 */
function coordJson(coord: Coord): unknown {
  if (typeof coord === 'number') {
    return coord;
  }
  const out: Record<string, unknown> = { ref: coord.ref };
  if (coord.dx !== undefined && coord.dx !== 0) {
    out.dx = coord.dx;
  }
  if (coord.dy !== undefined && coord.dy !== 0) {
    out.dy = coord.dy;
  }
  return out;
}

/** Parameters in `OP_PARAM_ORDER` order. `id` is added by the caller, first. */
function opParams(op: RawOp): Record<string, unknown> {
  switch (op.op) {
    case 'set_pixels':
      return {
        points: op.points.map(([x, y]) => [x, y]),
        color: op.color,
      };
    case 'rect':
      return {
        x: coordJson(op.x),
        y: coordJson(op.y),
        w: op.w,
        h: op.h,
        color: op.color,
      };
    case 'line':
      return {
        x1: coordJson(op.x1),
        y1: coordJson(op.y1),
        x2: coordJson(op.x2),
        y2: coordJson(op.y2),
        color: op.color,
      };
    case 'ellipse':
      return defined({
        x: coordJson(op.x),
        y: coordJson(op.y),
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
        x: coordJson(op.x),
        y: coordJson(op.y),
        color: op.color,
        connectivity: op.connectivity,
      });
    case 'dither_fill':
      return {
        x: coordJson(op.x),
        y: coordJson(op.y),
        w: op.w,
        h: op.h,
        color: op.color,
        pattern: op.pattern,
      };
    case 'ascii_blit':
      return {
        x: coordJson(op.x),
        y: coordJson(op.y),
        grid: [...op.grid],
        legend: { ...op.legend },
      };
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
    case 'light':
      return defined({
        angle: op.angle,
        form: op.form,
        ao: op.ao,
        cast: op.cast,
        cast_offset: op.castOffset,
        rim: op.rim,
        target_layer: op.targetLayer,
      });
    case 'replace_slot':
      return { from: op.from, to: op.to };
    case 'seal':
    case 'strays':
    case 'deband':
      return defined({ target_layer: op.targetLayer });
  }
}

export function canonicalOp(op: RawOp): Record<string, unknown> {
  const out: Record<string, unknown> = { op: op.op };
  if (op.part !== undefined) {
    out.part = op.part;
  }
  if (op.id !== undefined) {
    out.id = op.id;
  }
  return Object.assign(out, opParams(op));
}

export function canonicalRecipe(recipe: Recipe): Record<string, unknown> {
  const parts = recipeParts(recipe);
  const hasParts = Object.keys(parts).length > 0;
  const out: Record<string, unknown> = {
    version: recipe.version,
    meta: canonicalMeta(recipe),
    palette: canonicalPalette(recipe.palette),
  };
  if (hasParts) {
    out.parts = canonicalParts(parts);
  }
  out.anchors = canonicalAnchors(recipe.anchors);
  out.layers = recipe.layers.map((layer) => ({
    id: layer.id,
    ops: layer.ops.map((op) => canonicalOp(op)),
  }));
  return out;
}

export function serializeRecipe(recipe: Recipe): string {
  return `${JSON.stringify(canonicalRecipe(recipe), null, 2)}\n`;
}
