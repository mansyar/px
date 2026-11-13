/**
 * The indexed canvas. One Int16Array of slot references per layer, `-1` for
 * transparent. Channels never enter the buffer, so palette swaps are free.
 *
 * A parallel Int16Array of part indices carries ownership, `-1` unassigned. It
 * is bookkeeping only: shading never reads it to decide what exists, and it is
 * never serialised. Ownership is always last-writer-wins, exactly like colour,
 * so replaying an op list reproduces both buffers.
 */

import { TRANSPARENT_SLOT } from './palette.js';

export const UNOWNED = -1;

export class SlotCanvas {
  readonly width: number;
  readonly height: number;
  readonly slots: Int16Array;
  /** Declared part index per pixel, `UNOWNED` when no part claimed it. */
  readonly owners: Int16Array;
  /**
   * First coordinate a write was clipped at since the last reset. The compiler
   * clears it per op so a clipping warning can name the offending pixel.
   */
  clippedAt: [number, number] | null = null;
  /**
   * Part indices this op's writes displaced, distinct and in first-write order.
   * The compiler drains it after each op to emit at most one warning per op.
   */
  readonly displaced: number[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.slots = new Int16Array(width * height).fill(TRANSPARENT_SLOT);
    this.owners = new Int16Array(width * height).fill(UNOWNED);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  clearClipped(): void {
    this.clippedAt = null;
    this.displaced.length = 0;
  }

  /**
   * Write one pixel. Returns false when the coordinate was clipped.
   *
   * `owner` omits ownership changes entirely (a colour remap keeps its parts);
   * an explicit index, including `UNOWNED`, makes this op the owner.
   */
  set(x: number, y: number, slot: number, owner?: number): boolean {
    if (!this.inBounds(x, y)) {
      if (this.clippedAt === null) {
        this.clippedAt = [x, y];
      }
      return false;
    }
    const index = y * this.width + x;
    if (owner !== undefined) {
      const previous = this.owners[index] ?? UNOWNED;
      if (previous !== UNOWNED && previous !== owner && !this.displaced.includes(previous)) {
        this.displaced.push(previous);
      }
      this.owners[index] = owner;
    }
    this.slots[index] = slot;
    return true;
  }

  get(x: number, y: number): number {
    if (!this.inBounds(x, y)) {
      return TRANSPARENT_SLOT;
    }
    return this.slots[y * this.width + x] ?? TRANSPARENT_SLOT;
  }

  /** The part index owning a pixel, or `UNOWNED` outside the canvas. */
  ownerAt(x: number, y: number): number {
    if (!this.inBounds(x, y)) {
      return UNOWNED;
    }
    return this.owners[y * this.width + x] ?? UNOWNED;
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
