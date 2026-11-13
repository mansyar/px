/**
 * The debug sheet's zoom is a profile number, and the ruler interval follows it:
 * 8× and every 4 source pixels up to 48 px, 4× and every 8 up to 128, 2× and
 * every 16 above. These tests read the geometry back off the sheet, because that
 * is what a reviewer sees: panel A's cell size, the label spacing and the
 * caption line that names both.
 */

import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { GLYPH_HEIGHT } from '../../src/render/debug/font.js';
import {
  type DebugSheet,
  PANEL_SCALE,
  panelACell,
  renderDebugSheet,
} from '../../src/render/debug/sheet.js';

function sheetFor(size: number, profile?: string): DebugSheet {
  const meta: Record<string, unknown> = {
    name: 'sheet',
    width: size,
    height: size,
    alpha_mode: 'binary',
  };
  if (profile !== undefined) {
    meta.profile = profile;
  }
  const text = `${JSON.stringify({
    version: 1,
    meta,
    palette: { main: { colors: ['#000000'] } },
    anchors: { pivot: [Math.floor(size / 2), Math.floor(size / 2)] },
    layers: [
      {
        id: 'base',
        ops: [{ op: 'rect', x: 1, y: 1, w: size - 2, h: size - 2, color: 'main.0' }],
      },
    ],
  })}\n`;
  const parsed = parseRecipe(text);
  return renderDebugSheet(compileRecipe(parsed.recipe), parsed.recipe.anchors);
}

/** Count non-white pixels in a device-space rectangle of the sheet. */
function ink(sheet: DebugSheet, x: number, y: number, w: number, h: number): number {
  let count = 0;
  for (let row = y; row < y + h; row += 1) {
    for (let column = x; column < x + w; column += 1) {
      const offset = (row * sheet.width + column) * 4;
      const red = sheet.rgba[offset];
      const green = sheet.rgba[offset + 1];
      const blue = sheet.rgba[offset + 2];
      if (red !== 255 || green !== 255 || blue !== 255) {
        count += 1;
      }
    }
  }
  return count;
}

describe('panel A zooms by profile', () => {
  it('keeps 8x from tiny through small', () => {
    for (const size of [8, 32, 48]) {
      const sheet = sheetFor(size);
      const cell = panelACell(sheet.panels.a, 0, 0, sheet.zoom);
      expect(sheet.zoom).toBe(PANEL_SCALE);
      expect(cell.w).toBe(PANEL_SCALE);
      expect(cell.h).toBe(PANEL_SCALE);
      expect(sheet.panels.a.w).toBe(size * 9 + 1);
    }
  });

  it('steps down to 4x for medium and 2x for large', () => {
    const medium = sheetFor(64);
    expect(medium.profile).toBe('medium');
    expect(medium.zoom).toBe(4);
    expect(panelACell(medium.panels.a, 0, 0, medium.zoom).w).toBe(4);
    expect(medium.panels.a.w).toBe(64 * 5 + 1);

    const large = sheetFor(200);
    expect(large.profile).toBe('large');
    expect(large.zoom).toBe(2);
    expect(panelACell(large.panels.a, 0, 0, large.zoom).w).toBe(2);
    expect(large.panels.a.w).toBe(200 * 3 + 1);
  });

  it('keeps every derived panel under 1,100 px on a side', () => {
    for (const size of [16, 48, 128, 256]) {
      const sheet = sheetFor(size);
      expect(sheet.panels.a.w).toBeLessThanOrEqual(1100);
      expect(sheet.panels.a.h).toBeLessThanOrEqual(1100);
      expect(sheet.width).toBeLessThanOrEqual(1100);
      expect(sheet.height).toBeLessThanOrEqual(1400);
    }
  });

  it('follows the recipe override rather than the canvas', () => {
    const sheet = sheetFor(256, 'small');
    expect(sheet.zoom).toBe(PANEL_SCALE);
    expect(panelACell(sheet.panels.a, 0, 0, sheet.zoom).w).toBe(PANEL_SCALE);
  });

  it('leaves panels B and C at real size at every zoom', () => {
    for (const [size, profile] of [
      [16, undefined],
      [64, undefined],
      [128, undefined],
    ] as const) {
      const sheet = sheetFor(size, profile);
      expect(sheet.panels.b).toMatchObject({ w: size, h: size });
      expect(sheet.panels.c).toMatchObject({ w: size, h: size });
    }
  });
});

describe('ruler labels stay legible', () => {
  const RULER_HEIGHT = 9;

  /** Ink in the ruler strip above the cell at `x`, exclusive of its neighbours. */
  function labelInk(sheet: DebugSheet, x: number): number {
    const cell = panelACell(sheet.panels.a, x, 0, sheet.zoom);
    return ink(sheet, cell.x, sheet.panels.a.y - RULER_HEIGHT, cell.w, RULER_HEIGHT);
  }

  it('labels every 4 source pixels at 8x', () => {
    const sheet = sheetFor(48);
    expect(labelInk(sheet, 0)).toBeGreaterThan(0);
    expect(labelInk(sheet, 4)).toBeGreaterThan(0);
    expect(labelInk(sheet, 8)).toBeGreaterThan(0);
    for (const skipped of [1, 2, 3, 5, 6, 7]) {
      expect(labelInk(sheet, skipped)).toBe(0);
    }
  });

  it('labels every 8 source pixels at 4x', () => {
    const sheet = sheetFor(64);
    expect(labelInk(sheet, 0)).toBeGreaterThan(0);
    expect(labelInk(sheet, 8)).toBeGreaterThan(0);
    for (const skipped of [2, 4, 6]) {
      expect(labelInk(sheet, skipped)).toBe(0);
    }
  });

  it('labels every 16 source pixels at 2x', () => {
    const sheet = sheetFor(160);
    expect(labelInk(sheet, 0)).toBeGreaterThan(0);
    expect(labelInk(sheet, 16)).toBeGreaterThan(0);
    for (const skipped of [4, 8, 12]) {
      expect(labelInk(sheet, skipped)).toBe(0);
    }
  });
});

describe('the caption line', () => {
  function caption(sheet: DebugSheet): number[] {
    const start = sheet.panels.c.y + sheet.panels.c.h + 4;
    const strip: number[] = [];
    for (let y = start; y < start + GLYPH_HEIGHT * 2; y += 1) {
      for (let x = 0; x < sheet.width; x += 1) {
        const offset = (y * sheet.width + x) * 4;
        strip.push(sheet.rgba[offset] ?? 0);
      }
    }
    return strip;
  }

  it('prints something below the last panel', () => {
    expect(ink(sheetFor(32), 0, 0, 0, 0)).toBe(0);
    const sheet = sheetFor(32);
    expect(caption(sheet).some((value) => value === 0)).toBe(true);
  });

  it('names the profile, so two regimes do not read the same', () => {
    expect(caption(sheetFor(32, 'tiny'))).not.toEqual(caption(sheetFor(32, 'small')));
    expect(caption(sheetFor(32, 'small'))).not.toEqual(caption(sheetFor(32, 'large')));
  });

  it('stays byte-deterministic', () => {
    expect(Array.from(sheetFor(96).png)).toEqual(Array.from(sheetFor(96).png));
  });
});
