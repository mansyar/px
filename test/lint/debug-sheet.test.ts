import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { GLYPH_HEIGHT, GLYPH_WIDTH, glyphRows } from '../../src/render/debug/font.js';
import {
  type DebugSheet,
  PANEL_SCALE,
  panelACell,
  renderDebugSheet,
} from '../../src/render/debug/sheet.js';

interface SheetFixture {
  width?: number;
  height?: number;
  ops?: unknown[];
  anchors?: Record<string, [number, number]>;
  colors?: string[];
  backdrop?: string | null;
}

function sheet(fixture: SheetFixture = {}): DebugSheet {
  const width = fixture.width ?? 8;
  const height = fixture.height ?? 8;
  const text = JSON.stringify({
    version: 1,
    meta: { name: 'debug', width, height, alpha_mode: 'binary' },
    palette: { main: { colors: fixture.colors ?? ['#000000', '#ffffff'] } },
    anchors: fixture.anchors ?? {},
    layers: [{ id: 'base', ops: fixture.ops ?? [['rect', 1, 1, 6, 6, 'main.0']] }],
  });
  const parsed = parseRecipe(text);
  return renderDebugSheet(compileRecipe(parsed.recipe), parsed.recipe.anchors, {
    backdrop: fixture.backdrop,
  });
}

function pixelAt(sheetValue: DebugSheet, x: number, y: number): [number, number, number, number] {
  const offset = (y * sheetValue.width + x) * 4;
  return [
    sheetValue.rgba[offset],
    sheetValue.rgba[offset + 1],
    sheetValue.rgba[offset + 2],
    sheetValue.rgba[offset + 3],
  ];
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] * 0x1000000 +
      (bytes[offset + 1] << 16) +
      (bytes[offset + 2] << 8) +
      bytes[offset + 3]) >>>
    0
  );
}

function darkPixels(
  sheetValue: DebugSheet,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  let count = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const [r, g, b] = pixelAt(sheetValue, x, y);
      if (r < 64 && g < 64 && b < 64) {
        count += 1;
      }
    }
  }
  return count;
}

describe('debug sheet layout', () => {
  it('stacks three panels top to bottom with an 8x top panel', () => {
    const sheetValue = sheet();
    const { a, b, c } = sheetValue.panels;

    expect(a.h).toBeGreaterThanOrEqual(8 * 8);
    expect(a.w).toBeGreaterThanOrEqual(8 * 8);
    expect(b).toMatchObject({ w: 8, h: 8 });
    expect(c).toMatchObject({ w: 8, h: 8 });
    expect(a.y).toBeLessThan(b.y);
    expect(b.y).toBeLessThan(c.y);
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.h);
    expect(c.y).toBeGreaterThanOrEqual(b.y + b.h);
    expect(sheetValue.height).toBeGreaterThanOrEqual(c.y + c.h);
  });

  it('encodes a PNG whose header matches the composed sheet', () => {
    const sheetValue = sheet();
    const png = sheetValue.png;

    expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(readUint32(png, 16)).toBe(sheetValue.width);
    expect(readUint32(png, 20)).toBe(sheetValue.height);
    expect(sheetValue.rgba).toHaveLength(sheetValue.width * sheetValue.height * 4);
  });

  it('is byte-deterministic across runs', () => {
    expect(Array.from(sheet().png)).toEqual(Array.from(sheet().png));
  });

  it('scales each source pixel to a solid 8x8 cell', () => {
    const sheetValue = sheet({ ops: [['set_pixels', [[3, 3]], 'main.1']] });
    const cell = panelACell(sheetValue.panels.a, 3, 3);

    expect(cell.w).toBe(PANEL_SCALE);
    expect(cell.h).toBe(PANEL_SCALE);
    expect(pixelAt(sheetValue, cell.x, cell.y)).toEqual([255, 255, 255, 255]);
    expect(pixelAt(sheetValue, cell.x + PANEL_SCALE - 1, cell.y)).toEqual([255, 255, 255, 255]);
    expect(pixelAt(sheetValue, cell.x, cell.y + PANEL_SCALE - 1)).toEqual([255, 255, 255, 255]);
    expect(pixelAt(sheetValue, cell.x + PANEL_SCALE - 1, cell.y + PANEL_SCALE - 1)).toEqual([
      255, 255, 255, 255,
    ]);
  });

  it('separates cells with a one pixel grid line', () => {
    const sheetValue = sheet();
    const cell = panelACell(sheetValue.panels.a, 2, 2);
    expect(pixelAt(sheetValue, cell.x - 1, cell.y)).toEqual([128, 128, 128, 255]);
    expect(pixelAt(sheetValue, cell.x, cell.y - 1)).toEqual([128, 128, 128, 255]);
  });

  it('shows a checkerboard under transparent pixels', () => {
    const sheetValue = sheet({ ops: [['set_pixels', [[1, 1]], 'main.1']] });
    const even = panelACell(sheetValue.panels.a, 0, 0);
    const odd = panelACell(sheetValue.panels.a, 1, 0);
    const evenColor = pixelAt(sheetValue, even.x + 1, even.y + 1);
    const oddColor = pixelAt(sheetValue, odd.x + 1, odd.y + 1);

    expect(evenColor[3]).toBe(255);
    expect(oddColor[3]).toBe(255);
    expect(evenColor).not.toEqual(oddColor);
    expect(new Set([evenColor[0], oddColor[0]])).toEqual(new Set([204, 255]));
  });

  it('draws coordinate rulers above and left of the top panel', () => {
    const sheetValue = sheet({ width: 12, height: 12 });
    const { a } = sheetValue.panels;

    expect(darkPixels(sheetValue, a.x, 0, a.x + a.w, a.y)).toBeGreaterThan(0);
    expect(darkPixels(sheetValue, a.x - 9, a.y, a.x, a.y + a.h)).toBeGreaterThan(0);
  });

  it('places a crosshair and a marker at every declared anchor', () => {
    const sheetValue = sheet({ anchors: { pivot: [3, 2] } });
    const cell = panelACell(sheetValue.panels.a, 3, 2);
    const centreX = cell.x + Math.floor(PANEL_SCALE / 2);
    const centreY = cell.y + Math.floor(PANEL_SCALE / 2);

    expect(pixelAt(sheetValue, centreX, centreY)).toEqual([0, 0, 0, 255]);
    expect(pixelAt(sheetValue, centreX - 2, centreY - 2)).toEqual([255, 255, 255, 255]);
    expect(pixelAt(sheetValue, centreX - 2, centreY + 2)).toEqual([255, 255, 255, 255]);
  });

  it('draws the crosshair across the whole top panel', () => {
    const sheetValue = sheet({ anchors: { pivot: [4, 4] } });
    const { a } = sheetValue.panels;
    const cell = panelACell(a, 4, 4);
    const centreX = cell.x + Math.floor(PANEL_SCALE / 2);
    const column = [];
    for (let y = a.y; y < a.y + a.h; y += 1) {
      column.push(pixelAt(sheetValue, centreX, y));
    }
    expect(column.some((pixel) => pixel[0] === 0)).toBe(true);
    expect(column.some((pixel) => pixel[0] === 255 && pixel[3] === 255)).toBe(true);
  });

  it('ignores an anchor that falls outside the canvas', () => {
    const sheetValue = sheet({ anchors: { pivot: [99, 99] } });
    expect(sheetValue.width).toBeGreaterThan(0);
  });
});

describe('debug sheet panels b and c', () => {
  it('paints the 1x panel over the default grey backdrop', () => {
    const sheetValue = sheet({
      ops: [['set_pixels', [[2, 2]], 'main.1']],
      colors: ['#000000', '#ff0000'],
    });
    const { b } = sheetValue.panels;

    expect(pixelAt(sheetValue, b.x + 2, b.y + 2)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(sheetValue, b.x, b.y)).toEqual([128, 128, 128, 255]);
  });

  it('honours a custom backdrop', () => {
    const sheetValue = sheet({ backdrop: '#102030', ops: [] });
    const { b } = sheetValue.panels;
    expect(pixelAt(sheetValue, b.x, b.y)).toEqual([16, 32, 48, 255]);
  });

  it('accepts the opaque 8-digit backdrop and rejects a translucent one', () => {
    const opaque = sheet({ backdrop: '#102030ff', ops: [] });
    expect(pixelAt(opaque, opaque.panels.b.x, opaque.panels.b.y)).toEqual([16, 32, 48, 255]);

    // FR-18 and the product's alpha rule: a translucent panel would be the one
    // place the engine emits a partially transparent pixel.
    expect(() => sheet({ backdrop: '#10203040', ops: [] })).toThrow('alpha is binary');
  });

  it('leaves the 1x panel transparent when the backdrop is null', () => {
    const sheetValue = sheet({ backdrop: null, ops: [] });
    const { b } = sheetValue.panels;
    expect(pixelAt(sheetValue, b.x, b.y)).toEqual([0, 0, 0, 0]);
  });

  it('renders the silhouette panel as black on white', () => {
    const sheetValue = sheet({ ops: [['rect', 0, 0, 4, 4, 'main.0']] });
    const { c } = sheetValue.panels;

    expect(pixelAt(sheetValue, c.x, c.y)).toEqual([0, 0, 0, 255]);
    expect(pixelAt(sheetValue, c.x + 3, c.y + 3)).toEqual([0, 0, 0, 255]);
    expect(pixelAt(sheetValue, c.x + 4, c.y + 4)).toEqual([255, 255, 255, 255]);
  });
});

describe('embedded bitmap font', () => {
  it('defines a 3x5 glyph for every digit and label letter', () => {
    for (const character of '0123456789ABC') {
      const rows = glyphRows(character);
      expect(rows).toHaveLength(GLYPH_HEIGHT);
      for (const row of rows) {
        expect(row).toHaveLength(GLYPH_WIDTH);
      }
    }
  });

  it('falls back to a question mark for an unknown character', () => {
    expect(glyphRows('~')).toEqual(glyphRows('?'));
  });
});
