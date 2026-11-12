/**
 * ASCII inspector. One character per pixel, one letter per palette family,
 * `.` for transparent. Column and row headers are printed as decimal indices so
 * a coordinate read off the matrix is a coordinate an agent can edit.
 */

import type { SlotTable } from '../core/palette.js';
import { TRANSPARENT_SLOT } from '../core/palette.js';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LegendEntry {
  family: string;
  slots: string[];
}

export interface InspectResult {
  matrix: string;
  legend: Record<string, LegendEntry>;
}

export function letterForSlot(slots: SlotTable): string[] {
  const letters = new Array<string>(slots.names.length).fill('?');
  for (const family of slots.families) {
    for (const slot of family.slots) {
      const index = slots.resolve(slot);
      if (index !== undefined) {
        letters[index] = family.letter;
      }
    }
  }
  return letters;
}

export function renderRegion(
  flattened: Int16Array,
  width: number,
  slots: SlotTable,
  region: Region,
): InspectResult {
  const letters = letterForSlot(slots);
  const maxX = region.x + region.w - 1;
  const maxY = region.y + region.h - 1;
  const rowLabelWidth = Math.max(2, String(maxY).length);
  const columnLabelWidth = Math.max(1, String(maxX).length);
  const lines: string[] = [];

  for (let depth = 0; depth < columnLabelWidth; depth += 1) {
    let line = ' '.repeat(rowLabelWidth + 1);
    for (let column = 0; column < region.w; column += 1) {
      const label = String(region.x + column).padStart(columnLabelWidth, ' ');
      line += label[depth] ?? ' ';
    }
    lines.push(line);
  }

  for (let row = 0; row < region.h; row += 1) {
    const y = region.y + row;
    let line = `${String(y).padStart(rowLabelWidth, ' ')} `;
    for (let column = 0; column < region.w; column += 1) {
      const x = region.x + column;
      const slot = flattened[y * width + x];
      line += slot === TRANSPARENT_SLOT ? '.' : (letters[slot] ?? '?');
    }
    lines.push(line);
  }

  const legend: Record<string, LegendEntry> = {};
  for (const family of slots.families) {
    legend[family.letter] = { family: family.name, slots: family.slots };
  }

  return { matrix: lines.join('\n'), legend };
}
