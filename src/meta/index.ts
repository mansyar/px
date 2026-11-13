/**
 * Engine metadata projection (FR-17).
 *
 * One canonical projection feeds both blocks: the generic schema other engines
 * read, and the Godot 4 block. `offset` and `origin` carry the same numbers
 * because Godot 4's `Sprite2D` with `centered: false` draws from the texture's
 * top-left — the documented offset rule is therefore just the negation of the
 * trim origin.
 *
 * `recipe_hash` covers the canonical recipe bytes, never the PNG: hashing the
 * image would conflate provenance with whatever zlib did that day.
 */

import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import type { CompiledRecipe } from '../core/compile.js';
import { parseHex } from '../core/palette.js';
import { serializeRecipe } from '../core/recipe/serialize.js';
import { RAMP_ROLES, type Recipe } from '../core/recipe/types.js';
import { EMPTY_TRIM, type TrimBox, trimBounds } from './bounds.js';

export const META_VERSION = 1;
export const RECIPE_HASH_PREFIX = 'sha256:';

export interface PaletteManifestEntry {
  key: string;
  hex: string;
  rgba: [number, number, number, number];
}

export interface GodotMetadata {
  texture_path: string;
  filter: false;
  centered: false;
  /** Trim origin, negated: where the trimmed image's top-left sits on the canvas. */
  offset: [number, number];
  anchors: Record<string, [number, number]>;
}

export interface GenericMetadata {
  canvas: { width: number; height: number };
  trim: TrimBox;
  origin: { x: number; y: number };
  alpha_mode: 'binary';
  anchors: Record<string, { x: number; y: number }>;
  palette: PaletteManifestEntry[];
  recipe_hash: string;
}

export interface AssetMetadata {
  v: 1;
  name: string;
  godot: GodotMetadata;
  generic: GenericMetadata;
}

/** SHA-256 of the canonical recipe text, prefixed so the field is self-describing. */
export function recipeHash(recipe: Recipe): string {
  const bytes = Buffer.from(serializeRecipe(recipe), 'utf8');
  return `${RECIPE_HASH_PREFIX}${createHash('sha256').update(bytes).digest('hex')}`;
}

/** `hero.png` pairs with `hero.meta.json`. */
export function metadataPath(pngPath: string): string {
  return pngPath.toLowerCase().endsWith('.png')
    ? `${pngPath.slice(0, -'.png'.length)}.meta.json`
    : `${pngPath}.meta.json`;
}

/**
 * Palette manifest in canonical slot order: families sorted by name, ramp roles
 * in `RAMP_ROLES` order, flat colours by index. The hex is the authored text so
 * the manifest and the recipe agree character for character.
 */
export function paletteManifest(recipe: Recipe): PaletteManifestEntry[] {
  const entries: PaletteManifestEntry[] = [];
  const push = (key: string, hex: string): void => {
    const rgba = parseHex(hex);
    if (rgba === null) {
      return;
    }
    entries.push({ key, hex, rgba: [rgba.r, rgba.g, rgba.b, rgba.a] });
  };

  for (const name of Object.keys(recipe.palette).sort()) {
    const family = recipe.palette[name];
    if (family === undefined) {
      continue;
    }
    if ('ramp' in family) {
      for (const role of RAMP_ROLES) {
        const hex = family.ramp[role];
        if (hex !== undefined) {
          push(`${name}.${role}`, hex);
        }
      }
    } else if ('colors' in family) {
      family.colors.forEach((hex, index) => {
        push(`${name}.${index}`, hex);
      });
    }
  }
  return entries;
}

export function buildMetadata(
  recipe: Recipe,
  compiled: CompiledRecipe,
  texturePath: string,
  paletteRecipe: Recipe = recipe,
): AssetMetadata {
  const trim = trimBounds(compiled.flattened, compiled.width, compiled.height) ?? EMPTY_TRIM;
  // `0 - 0` rather than `-0`: the negation must never put negative zero in JSON.
  const originX = 0 - trim.x;
  const originY = 0 - trim.y;
  const anchors = Object.keys(recipe.anchors).sort();
  const godotAnchors: Record<string, [number, number]> = {};
  const genericAnchors: Record<string, { x: number; y: number }> = {};
  for (const name of anchors) {
    const point = recipe.anchors[name];
    if (point === undefined) {
      continue;
    }
    godotAnchors[name] = [point[0], point[1]];
    genericAnchors[name] = { x: point[0], y: point[1] };
  }

  return {
    v: META_VERSION,
    name: recipe.meta.name,
    godot: {
      texture_path: basename(texturePath),
      filter: false,
      centered: false,
      offset: [originX, originY],
      anchors: godotAnchors,
    },
    generic: {
      canvas: { width: compiled.width, height: compiled.height },
      trim,
      origin: { x: originX, y: originY },
      alpha_mode: recipe.meta.alphaMode,
      anchors: genericAnchors,
      // The manifest describes the colours the PNG was drawn with; the hash
      // describes the recipe file, so a swap changes the first and not the second.
      palette: paletteManifest(paletteRecipe),
      recipe_hash: recipeHash(recipe),
    },
  };
}

/** Metadata is written as expanded JSON with a trailing newline, like recipes. */
export function serializeMetadata(metadata: AssetMetadata): string {
  return `${JSON.stringify(metadata, null, 2)}\n`;
}
