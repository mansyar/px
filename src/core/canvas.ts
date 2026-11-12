/**
 * The indexed canvas. One Int16Array of slot references per layer, `-1` for
 * transparent. Channels never enter the buffer, so palette swaps are free.
 */

import { TRANSPARENT_SLOT } from './palette.js';

export class SlotCanvas {
  readonly width: number;
  readonly height: number;
  readonly slots: Int16Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.slots = new Int16Array(width * height).fill(TRANSPARENT_SLOT);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** Write one pixel. Returns false when the coordinate was clipped. */
  set(x: number, y: number, slot: number): boolean {
    if (!this.inBounds(x, y)) {
      return false;
    }
    this.slots[y * this.width + x] = slot;
    return true;
  }

  get(x: number, y: number): number {
    if (!this.inBounds(x, y)) {
      return TRANSPARENT_SLOT;
    }
    return this.slots[y * this.width + x];
  }

  paintedCount(): number {
    let count = 0;
    for (const slot of this.slots) {
      if (slot !== TRANSPARENT_SLOT) {
        count += 1;
      }
    }
    return count;
  }
}
