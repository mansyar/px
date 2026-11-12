/**
 * A tiny RGBA canvas for composing the debug sheet.
 *
 * Every draw clips; nothing here allocates per pixel beyond the frame buffer, so
 * composing a 256×256 sprite sheet stays linear in output size.
 */

import type { Rgba } from '../../core/palette.js';
import { GLYPH_WIDTH, glyphRows } from './font.js';

export const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };

export class PixelBuffer {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.rgba = new Uint8Array(width * height * 4);
  }

  contains(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  set(x: number, y: number, color: Rgba): void {
    if (!this.contains(x, y)) {
      return;
    }
    const offset = (y * this.width + x) * 4;
    this.rgba[offset] = color.r;
    this.rgba[offset + 1] = color.g;
    this.rgba[offset + 2] = color.b;
    this.rgba[offset + 3] = color.a;
  }

  fillRect(x: number, y: number, w: number, h: number, color: Rgba): void {
    for (let row = 0; row < h; row += 1) {
      for (let column = 0; column < w; column += 1) {
        this.set(x + column, y + row, color);
      }
    }
  }

  /** Erase a rectangle to fully transparent pixels. */
  clearRect(x: number, y: number, w: number, h: number): void {
    this.fillRect(x, y, w, h, TRANSPARENT);
  }

  /** Copy an RGBA block, leaving transparent source pixels alone. */
  overlay(
    source: Uint8Array,
    sourceWidth: number,
    sourceHeight: number,
    atX: number,
    atY: number,
  ): void {
    for (let y = 0; y < sourceHeight; y += 1) {
      for (let x = 0; x < sourceWidth; x += 1) {
        const offset = (y * sourceWidth + x) * 4;
        if (source[offset + 3] === 0) {
          continue;
        }
        this.set(atX + x, atY + y, {
          r: source[offset],
          g: source[offset + 1],
          b: source[offset + 2],
          a: source[offset + 3],
        });
      }
    }
  }

  drawGlyph(character: string, x: number, y: number, color: Rgba, scale = 1): void {
    const rows = glyphRows(character);
    for (let row = 0; row < rows.length; row += 1) {
      const pattern = rows[row];
      for (let column = 0; column < pattern.length; column += 1) {
        if (pattern[column] !== '#') {
          continue;
        }
        this.fillRect(x + column * scale, y + row * scale, scale, scale, color);
      }
    }
  }

  drawText(text: string, x: number, y: number, color: Rgba, scale = 1): void {
    let cursor = x;
    for (const character of text) {
      if (character !== ' ') {
        this.drawGlyph(character, cursor, y, color, scale);
      }
      cursor += (GLYPH_WIDTH + 1) * scale;
    }
  }

  /** Width of a drawn string, excluding the trailing letter spacing. */
  textWidth(text: string, scale = 1): number {
    if (text.length === 0) {
      return 0;
    }
    return (text.length * (GLYPH_WIDTH + 1) - 1) * scale;
  }
}
