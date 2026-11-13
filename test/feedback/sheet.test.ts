import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { type DebugSheet, panelACell, renderDebugSheet } from '../../src/render/debug/sheet.js';

const PALETTE = {
  cloth: { ramp: { outline: '#000000', shadow: '#440000', base: '#880000', highlight: '#ff0000' } },
};

interface SheetFixture {
  parts: Record<string, unknown>;
  ops: unknown[];
  width?: number;
  height?: number;
}

function sheetOf(fixture: SheetFixture): DebugSheet {
  const width = fixture.width ?? 16;
  const height = fixture.height ?? 16;
  const parsed = parseRecipe(
    JSON.stringify({
      version: '1.1',
      meta: { name: 'feedback', width, height, alpha_mode: 'binary' },
      palette: PALETTE,
      parts: fixture.parts,
      anchors: {},
      layers: [{ id: 'base', ops: fixture.ops }],
    }),
  );
  return renderDebugSheet(compileRecipe(parsed.recipe), parsed.recipe.anchors, {});
}

function pixelAt(sheetValue: DebugSheet, x: number, y: number): number[] {
  const offset = (y * sheetValue.width + x) * 4;
  return [
    sheetValue.rgba[offset] ?? 0,
    sheetValue.rgba[offset + 1] ?? 0,
    sheetValue.rgba[offset + 2] ?? 0,
    sheetValue.rgba[offset + 3] ?? 0,
  ];
}

function facingPair(facing: unknown): Record<string, unknown> {
  return {
    left: { material: 'cloth', facing: 'front' },
    right: { material: 'cloth', ...(facing === undefined ? {} : { facing }) },
  };
}

const SPLIT = [
  { op: 'rect', x: 0, y: 0, w: 8, h: 16, color: 'cloth.base', part: 'left' },
  { op: 'rect', x: 8, y: 0, w: 8, h: 16, color: 'cloth.base', part: 'right' },
];

describe('debug sheet — plane boundaries (FR-14, P4.T1.1)', () => {
  it('marks the shared edge between two different planes', () => {
    const sheetValue = sheetOf({ parts: facingPair('right'), ops: SPLIT });
    const cell = panelACell(sheetValue.panels.a, 7, 8, sheetValue.zoom);
    const boundaryX = cell.x + sheetValue.zoom;
    const colors = new Set<string>();
    for (let y = cell.y; y < cell.y + sheetValue.zoom; y += 1) {
      colors.add(pixelAt(sheetValue, boundaryX, y).join(','));
    }
    // Two-tone dashes: black and white, not the grey grid line.
    expect(colors.has('0,0,0,255')).toBe(true);
    expect(colors.has('255,255,255,255')).toBe(true);
    expect(colors.has('128,128,128,255')).toBe(false);
  });

  it('names the facing pair in the notes line, legibly at the profile zoom', () => {
    const sheetValue = sheetOf({ parts: facingPair('right'), ops: SPLIT });
    expect(sheetValue.notes?.[0]).toBe('PLANES 16 FRONT-RIGHT');
  });

  it('leaves the edge alone when both parts declare the same plane', () => {
    const sheetValue = sheetOf({ parts: facingPair('front'), ops: SPLIT });
    const cell = panelACell(sheetValue.panels.a, 7, 8, sheetValue.zoom);
    const colors = new Set<string>();
    for (let y = cell.y; y < cell.y + sheetValue.zoom; y += 1) {
      colors.add(pixelAt(sheetValue, cell.x + sheetValue.zoom, y).join(','));
    }
    expect(colors).toEqual(new Set(['128,128,128,255']));
    expect(sheetValue.notes).toBeUndefined();
  });

  it('treats a named plane and its vector as the same plane', () => {
    // `[0, 0, 1]` is the vector form of `front`, the plane the other part declares.
    const sheetValue = sheetOf({ parts: facingPair([0, 0, 1]), ops: SPLIT });
    expect(sheetValue.notes).toBeUndefined();
  });

  it('distinguishes a vector plane from a different name', () => {
    const sheetValue = sheetOf({ parts: facingPair([1, 0, 0]), ops: SPLIT });
    expect(sheetValue.notes?.[0]).toBe('PLANES 16 FRONT-RIGHT');
  });

  it('leaves an undeclared plane viewer-facing, like an explicit front', () => {
    const sheetValue = sheetOf({ parts: facingPair(undefined), ops: SPLIT });
    expect(sheetValue.notes).toBeUndefined();
  });
});

describe('debug sheet — texture spacing (FR-14, P4.T1.2)', () => {
  const WALL = { op: 'rect', x: 0, y: 0, w: 16, h: 16, color: 'cloth.base', part: 'wall' };
  const TEXTURE = { op: 'texture', pattern: 'stipple', color: 'cloth.shadow', part: 'wall' };

  it('draws the lattice as a gauge at the panel zoom, with a bounded note', () => {
    const sheetValue = sheetOf({ parts: { wall: { material: 'cloth' } }, ops: [WALL, TEXTURE] });
    expect(sheetValue.notes?.some((note) => note.startsWith('TEXTURE STIPPLE'))).toBe(true);
    const gauge = sheetValue.gauge;
    expect(gauge).toBeDefined();
    if (gauge === undefined) {
      return;
    }
    expect(gauge).toMatchObject({ mark: 1, gap: 2, zoom: sheetValue.zoom });
    // Two black marks with the gap between them: the gauge is drawn, not described.
    expect(pixelAt(sheetValue, gauge.x, gauge.y)).toEqual([0, 0, 0, 255]);
    const second = gauge.x + gauge.mark * gauge.zoom + gauge.gap * gauge.zoom;
    expect(pixelAt(sheetValue, second, gauge.y)).toEqual([0, 0, 0, 255]);
    const middle = gauge.x + gauge.mark * gauge.zoom + Math.floor((gauge.gap * gauge.zoom) / 2);
    expect(pixelAt(sheetValue, middle, gauge.y)).toEqual([255, 255, 255, 255]);
  });

  it('grows the sheet by a line instead of adding a panel', () => {
    const plain = sheetOf({ parts: { wall: { material: 'cloth' } }, ops: [WALL] });
    const textured = sheetOf({ parts: { wall: { material: 'cloth' } }, ops: [WALL, TEXTURE] });
    expect(textured.height).toBeGreaterThan(plain.height);
    expect(textured.panels).toEqual(plain.panels);
  });

  it('reports the density the op used', () => {
    const sheetValue = sheetOf({
      parts: { wall: { material: 'cloth' } },
      ops: [WALL, { ...TEXTURE, density: 3 }],
    });
    expect(sheetValue.notes?.some((note) => note.includes('D3'))).toBe(true);
  });
});
