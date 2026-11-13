/**
 * Part masks, derived from replay.
 *
 * A part owns a pixel when the last op to write it was tagged with that part.
 * Nothing here is stored in the recipe: the compiler replays the op list and
 * reads the ownership buffer the canvas kept, so two identical replays produce
 * identical masks (FR-3).
 */

import { UNOWNED } from './canvas.js';
import { type Rgba, type SlotTable, TRANSPARENT_SLOT } from './palette.js';
import type { Facing, GlossProfile, Parts } from './recipe/types.js';

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
  /** The plane the part declared; absent when it is viewer-facing. */
  facing?: Facing;
  painted: number;
  /** `null` for a part that owns no pixels; representable, never serialised. */
  bounds: PartBounds | null;
}

/** Declared names in canonical order; the position is the owner index. */
export function partNames(parts: Parts): string[] {
  return Object.keys(parts).sort();
}

/** The hint every undeclared-part error carries: what the recipe did declare. */
export function partHint(names: readonly string[]): string {
  return names.length === 0
    ? 'Declare parts first, e.g. "parts": {"blade": {"material": "steel"}}.'
    : `Declared parts are ${names.join(', ')}.`;
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
      ...(declaration?.facing === undefined ? {} : { facing: declaration.facing }),
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

/** One slot's share of a part: the tone table an agent reads after a render. */
export interface PartTone {
  slot: string;
  count: number;
}

/** Per-part tones are capped so a 2000-op scene cannot grow the response. */
export const TONE_CAP = 24;

/** The value histogram is always this wide, so its shape never varies. */
export const VALUE_BUCKETS = 8;

/**
 * WCAG relative luminance, 0 (black) to 1 (white). Kept local because core
 * never imports the palette authoring layer; `lint/contrast.ts` carries the same
 * formula for the same reason.
 */
function relativeLuminance(color: Rgba): number {
  const linear = (channel: number): number => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

export interface PartDetail extends CompiledPart {
  /** Tone slots, most used first, ties broken by slot name. */
  tones: PartTone[];
  /** Distinct slots the part painted, before the cap. */
  slot_count: number;
  /** Present only when `tones` was cut at TONE_CAP. */
  truncated?: true;
  /** Always VALUE_BUCKETS counts of relative luminance, bucket i = [i/8, (i+1)/8). */
  values: number[];
}

/**
 * Per-part statistics for `inspect` (FR-24): painted count and bounds from the
 * owner buffer, plus the tone table and the fixed luminance histogram. Tones
 * are counted, never sampled, so the table is exact for the art it describes.
 */
export function partDetails(
  width: number,
  height: number,
  owners: Int16Array,
  flattened: Int16Array,
  parts: Parts,
  slots: SlotTable,
): PartDetail[] {
  const names = partNames(parts);
  const counts = new Int32Array(names.length);
  const minX = new Int32Array(names.length).fill(width);
  const minY = new Int32Array(names.length).fill(height);
  const maxX = new Int32Array(names.length).fill(-1);
  const maxY = new Int32Array(names.length).fill(-1);
  const tones: Array<Map<number, number>> = names.map(() => new Map());
  const values: Uint32Array[] = names.map(() => new Uint32Array(VALUE_BUCKETS));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const owner = owners[index] ?? UNOWNED;
      if (owner < 0 || owner >= names.length) {
        continue;
      }
      const slot = flattened[index] ?? TRANSPARENT_SLOT;
      if (slot === TRANSPARENT_SLOT) {
        continue;
      }
      counts[owner] = (counts[owner] ?? 0) + 1;
      const toneMap = tones[owner];
      if (toneMap !== undefined) {
        toneMap.set(slot, (toneMap.get(slot) ?? 0) + 1);
      }
      const histogram = values[owner];
      if (histogram !== undefined) {
        const rgba = slots.rgba[slot] ?? { r: 0, g: 0, b: 0, a: 255 };
        const bucket = Math.min(
          VALUE_BUCKETS - 1,
          Math.floor(relativeLuminance(rgba) * VALUE_BUCKETS),
        );
        histogram[bucket] = (histogram[bucket] ?? 0) + 1;
      }
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
    const toneMap = tones[index] ?? new Map<number, number>();
    const ranked = [...toneMap.entries()]
      .map(([slot, count]) => ({ slot: slots.names[slot] ?? `slot_${slot}`, count }))
      .sort(
        (leftTone, rightTone) =>
          rightTone.count - leftTone.count || (leftTone.slot < rightTone.slot ? -1 : 1),
      );
    const listed = ranked.slice(0, TONE_CAP);
    const detail: PartDetail = {
      name,
      material: declaration?.material ?? '',
      gloss: declaration?.gloss ?? 'matte',
      z: declaration?.z ?? 0,
      ...(declaration?.facing === undefined ? {} : { facing: declaration.facing }),
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
      tones: listed,
      slot_count: ranked.length,
      values: [...(values[index] ?? new Uint32Array(VALUE_BUCKETS))],
    };
    if (ranked.length > TONE_CAP) {
      detail.truncated = true;
    }
    return detail;
  });
}
