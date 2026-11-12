import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import type { Recipe } from '../../src/core/recipe/types.js';
import { trimBounds } from '../../src/meta/bounds.js';
import {
  buildMetadata,
  metadataPath,
  paletteManifest,
  recipeHash,
  serializeMetadata,
} from '../../src/meta/index.js';
import { renderRecipe, sha256Hex } from '../../src/render/render.js';

const HERO = readFileSync(
  join(process.cwd(), 'test', 'goldens', 'fixtures', 'hero.px.json'),
  'utf8',
);
const hero: Recipe = parseRecipe(HERO).recipe;

function emptyRecipe(width = 8, height = 8): Recipe {
  return parseRecipe(
    JSON.stringify({
      version: 1,
      meta: { name: 'empty', width, height, alpha_mode: 'binary' },
      palette: { main: { colors: ['#000000'] } },
      anchors: { pivot: [0, 0] },
      layers: [{ id: 'base', ops: [] }],
    }),
  ).recipe;
}

describe('trim bounds', () => {
  it('is the tightest box around painted pixels', () => {
    const compiled = compileRecipe(hero);
    expect(trimBounds(compiled.flattened, 16, 16)).toEqual({ x: 4, y: 4, w: 8, h: 8 });
  });

  it('is null when nothing is painted', () => {
    const compiled = compileRecipe(emptyRecipe());
    expect(trimBounds(compiled.flattened, 8, 8)).toBeNull();
  });
});

describe('metadata projection', () => {
  const compiled = compileRecipe(hero);
  const metadata = buildMetadata(hero, compiled, 'out/hero.png');

  it('carries the pinned top-level shape', () => {
    expect(Object.keys(metadata)).toEqual(['v', 'name', 'godot', 'generic']);
    expect(metadata.v).toBe(1);
    expect(metadata.name).toBe('hero');
    expect(Object.keys(metadata.godot)).toEqual([
      'texture_path',
      'filter',
      'centered',
      'offset',
      'anchors',
    ]);
    expect(Object.keys(metadata.generic)).toEqual([
      'canvas',
      'trim',
      'origin',
      'alpha_mode',
      'anchors',
      'palette',
      'recipe_hash',
    ]);
  });

  it('reproduces the trim box and negates it for the origin', () => {
    expect(metadata.generic.trim).toEqual({ x: 4, y: 4, w: 8, h: 8 });
    expect(metadata.generic.origin).toEqual({ x: -4, y: -4 });
    expect(metadata.godot.offset).toEqual([-4, -4]);
    expect(metadata.generic.canvas).toEqual({ width: 16, height: 16 });
    expect(metadata.generic.alpha_mode).toBe('binary');
  });

  it('projects anchors in canvas space and as Godot tuples', () => {
    expect(metadata.generic.anchors).toEqual({ pivot: { x: 8, y: 8 } });
    expect(metadata.godot.anchors).toEqual({ pivot: [8, 8] });
  });

  it('names the texture after the PNG, not the recipe', () => {
    expect(metadata.godot.texture_path).toBe('hero.png');
    expect(metadata.godot.filter).toBe(false);
    expect(metadata.godot.centered).toBe(false);
    expect(buildMetadata(hero, compiled, 'iron_sword.png').godot.texture_path).toBe(
      'iron_sword.png',
    );
  });

  it('lists every slot with its authored hex and resolved channels', () => {
    expect(metadata.generic.palette).toEqual([
      { key: 'cloth.outline', hex: '#1a1c2c', rgba: [26, 28, 44, 255] },
      { key: 'cloth.shadow', hex: '#5d275d', rgba: [93, 39, 93, 255] },
      { key: 'cloth.base', hex: '#b13e53', rgba: [177, 62, 83, 255] },
      { key: 'cloth.highlight', hex: '#ef7d57', rgba: [239, 125, 87, 255] },
      { key: 'skin.0', hex: '#ffcd75', rgba: [255, 205, 117, 255] },
      { key: 'skin.1', hex: '#a7f070', rgba: [167, 240, 112, 255] },
    ]);
    expect(paletteManifest(hero)).toEqual(metadata.generic.palette);
  });

  it('keeps an anchor outside the canvas instead of dropping it', () => {
    const outOfBounds = parseRecipe(
      JSON.stringify({
        version: 1,
        meta: { name: 'far', width: 8, height: 8, alpha_mode: 'binary' },
        palette: { main: { colors: ['#000000'] } },
        anchors: { far: [-3, 20] },
        layers: [{ id: 'base', ops: [] }],
      }),
    ).recipe;
    const projected = buildMetadata(outOfBounds, compileRecipe(outOfBounds), 'far.png');
    expect(projected.generic.anchors).toEqual({ far: { x: -3, y: 20 } });
    expect(projected.godot.anchors).toEqual({ far: [-3, 20] });
  });

  it('exports a zero trim and zero origin for an empty canvas', () => {
    const empty = emptyRecipe();
    const projected = buildMetadata(empty, compileRecipe(empty), 'empty.png');
    expect(projected.generic.trim).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    expect(projected.generic.origin).toEqual({ x: 0, y: 0 });
    expect(projected.godot.offset).toEqual([0, 0]);
  });
});

describe('recipe hash', () => {
  it('hashes the canonical recipe bytes, prefixed', () => {
    const expected = createHash('sha256')
      .update(Buffer.from(serializeRecipe(hero), 'utf8'))
      .digest('hex');
    expect(recipeHash(hero)).toBe(`sha256:${expected}`);
    expect(recipeHash(hero)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('is stable across a parse and serialize round trip', () => {
    expect(recipeHash(parseRecipe(serializeRecipe(hero)).recipe)).toBe(recipeHash(hero));
  });

  it('is not the PNG hash', () => {
    const png = renderRecipe(hero).png;
    expect(recipeHash(hero)).not.toBe(`sha256:${sha256Hex(png)}`);
  });

  it('changes when the palette changes', () => {
    const swapped = parseRecipe(
      JSON.stringify({
        ...JSON.parse(serializeRecipe(hero)),
        palette: {
          cloth: {
            ramp: {
              outline: '#101010',
              shadow: '#202020',
              base: '#303030',
              highlight: '#404040',
            },
          },
          skin: { colors: ['#ffcd75', '#a7f070'] },
        },
      }),
    ).recipe;
    expect(recipeHash(swapped)).not.toBe(recipeHash(hero));
  });
});

describe('metadata serialization', () => {
  it('writes expanded JSON with a trailing newline that parses back', () => {
    const metadata = buildMetadata(hero, compileRecipe(hero), 'hero.png');
    const text = serializeMetadata(metadata);
    expect(text.endsWith('}\n')).toBe(true);
    expect(text).toContain('\n  "godot": {');
    expect(JSON.parse(text)).toEqual(metadata);
    expect(JSON.parse(text)).toStrictEqual(metadata);
  });

  it('pairs a PNG with its metadata sibling', () => {
    expect(metadataPath('out/hero.png')).toBe('out/hero.meta.json');
    expect(metadataPath('hero.PNG')).toBe('hero.meta.json');
    expect(metadataPath('hero')).toBe('hero.meta.json');
  });
});
