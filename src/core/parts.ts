/**
 * Part masks, derived from replay.
 *
 * A part owns a pixel when the last op to write it was tagged with that part.
 * Nothing here is stored in the recipe: the compiler replays the op list and
 * reads the ownership buffer the canvas kept, so two identical replays produce
 * identical masks (FR-3).
 */

import { UNOWNED } from './canvas.js';
import { TRANSPARENT_SLOT } from './palette.js';
import type { GlossProfile, Parts } from './recipe/types.js';

export interface PartBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CompiledPart {
  name: string;
  material: string;
  gloss: GlossProfile;
  z: number;
  painted: number;
  /** `null` for a part that owns no pixels; representable, never serialised. */
  bounds: PartBounds | null;
}

/** Declared names in canonical order; the position is the owner index. */
export function partNames(parts: Parts): string[] {
  return Object.keys(parts).sort();
}

export function partIndex(parts: Parts): Map<string, number> {
  const index = new Map<string, number>();
  partNames(parts).forEach((name, position) => {
    index.set(name, position);
  });
  return index;
}

interface OwnedCanvas {
  slots: Int16Array;
  owners: Int16Array;
}

/** Flattened ownership: across layers, the topmost painted pixel owns the cell. */
export function flattenOwners(layers: ReadonlyArray<OwnedCanvas>): Int16Array {
  const size = layers[0]?.slots.length ?? 0;
  const flat = new Int16Array(size).fill(UNOWNED);
  for (const layer of layers) {
    for (let index = 0; index < size; index += 1) {
      if (layer.slots[index] !== TRANSPARENT_SLOT) {
        flat[index] = layer.owners[index] ?? UNOWNED;
      }
    }
  }
  return flat;
}

/** Pixel count and tight bounds per declared part, in canonical name order. */
export function partStats(
  width: number,
  height: number,
  owners: Int16Array,
  parts: Parts,
): CompiledPart[] {
  const names = partNames(parts);
  const counts = new Int32Array(names.length);
  const minX = new Int32Array(names.length).fill(width);
  const minY = new Int32Array(names.length).fill(height);
  const maxX = new Int32Array(names.length).fill(-1);
  const maxY = new Int32Array(names.length).fill(-1);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const owner = owners[y * width + x] ?? UNOWNED;
      if (owner < 0 || owner >= names.length) {
        continue;
      }
      counts[owner] = (counts[owner] ?? 0) + 1;
      if (x < (minX[owner] ?? width)) {
        minX[owner] = x;
      }
      if (y < (minY[owner] ?? height)) {
        minY[owner] = y;
      }
      if (x > (maxX[owner] ?? -1)) {
        maxX[owner] = x;
      }
      if (y > (maxY[owner] ?? -1)) {
        maxY[owner] = y;
      }
    }
  }

  return names.map((name, index) => {
    const declaration = parts[name];
    const painted = counts[index] ?? 0;
    const left = minX[index] ?? 0;
    const top = minY[index] ?? 0;
    return {
      name,
      material: declaration?.material ?? '',
      gloss: declaration?.gloss ?? 'matte',
      z: declaration?.z ?? 0,
      painted,
      bounds:
        painted === 0
          ? null
          : {
              x: left,
              y: top,
              w: (maxX[index] ?? left) - left + 1,
              h: (maxY[index] ?? top) - top + 1,
            },
    };
  });
}
