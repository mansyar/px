/**
 * Slot grid to RGBA8. This is the only place a colour channel exists; the
 * canvas itself never stores one.
 */

import { type SlotTable, TRANSPARENT_RGBA, TRANSPARENT_SLOT } from '../core/palette.js';

export function rasterizeSlots(
  flattened: Int16Array,
  width: number,
  height: number,
  slots: SlotTable,
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  for (let index = 0; index < flattened.length; index += 1) {
    const slot = flattened[index];
    const colour = slot === TRANSPARENT_SLOT ? TRANSPARENT_RGBA : slots.rgba[slot];
    const destination = index * 4;
    if (colour === undefined) {
      continue;
    }
    rgba[destination] = colour.r;
    rgba[destination + 1] = colour.g;
    rgba[destination + 2] = colour.b;
    rgba[destination + 3] = colour.a;
  }
  return rgba;
}
