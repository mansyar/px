import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import { renderRecipe, sha256Hex } from '../../src/render/render.js';

const BENCHMARKS = join(process.cwd(), 'test', 'benchmarks');

describe('pre-track compatibility (AC-12, P4.T2.1)', () => {
  it('renders a pre-track recipe to its committed digest', () => {
    const text = readFileSync(join(BENCHMARKS, 'potion', 'potion.px.json'), 'utf8');
    const expected = readFileSync(join(BENCHMARKS, 'potion', 'potion.sha256'), 'utf8').trim();
    expect(expected).toMatch(/^[0-9a-f]{64}$/);

    const first = renderRecipe(parseRecipe(text).recipe);
    const second = renderRecipe(parseRecipe(text).recipe);

    expect(first.warnings).toEqual([]);
    expect(sha256Hex(first.png)).toBe(expected);
    expect(sha256Hex(second.png)).toBe(expected);
  });

  it('keeps the hero golden and every benchmark recipe renderable', () => {
    for (const asset of ['sword', 'humanoid', 'chest']) {
      const text = readFileSync(join(BENCHMARKS, asset, `${asset}.px.json`), 'utf8');
      const expected = readFileSync(join(BENCHMARKS, asset, `${asset}.sha256`), 'utf8').trim();
      expect(sha256Hex(renderRecipe(parseRecipe(text).recipe).png), asset).toBe(expected);
    }
  });
});

describe('all three primitives round-trip (FR-15, P4.T2.2)', () => {
  const TEXT = JSON.stringify({
    version: '1.1',
    meta: { name: 'primitives', width: 32, height: 32, alpha_mode: 'binary' },
    palette: {
      cloth: {
        ramp: { outline: '#000000', shadow: '#440000', base: '#880000', highlight: '#ff0000' },
      },
    },
    parts: {
      wall: { material: 'cloth', gloss: 'matte', z: 0, facing: 'right' },
      trim: { material: 'cloth', gloss: 'matte', z: 1, facing: [0, 1, 0] },
    },
    anchors: {},
    layers: [
      {
        id: 'base',
        ops: [
          { op: 'rect', x: 2, y: 2, w: 20, h: 20, color: 'cloth.base', part: 'wall' },
          {
            op: 'stroke',
            path: [
              [4, 4],
              [18, 4],
              [18, 18],
            ],
            color: 'cloth.shadow',
            part: 'wall',
            smooth: true,
            width: 2,
          },
          {
            op: 'texture',
            pattern: 'mottle',
            color: 'highlight',
            density: 3,
            part: 'wall',
          },
          { op: 'rect', x: 24, y: 2, w: 4, h: 20, color: 'cloth.base', part: 'trim' },
          {
            op: 'light',
            angle: 'top-left',
            form: 'bevel',
            ao: true,
            cast: null,
            cast_offset: 2,
            rim: 'none',
          },
        ],
      },
    ],
  });

  it('writes back exactly what it read', () => {
    const recipe = parseRecipe(TEXT).recipe;
    const first = serializeRecipe(recipe);
    const second = serializeRecipe(parseRecipe(first).recipe);
    expect(second).toBe(first);
  });

  it('keeps facing, stroke and texture fields through the canonical writer', () => {
    const text = serializeRecipe(parseRecipe(TEXT).recipe);
    expect(text).toContain('"facing": "right"');
    expect(text).toContain('"facing": [');
    expect(text).toContain('"op": "stroke"');
    expect(text).toContain('"smooth": true');
    expect(text).toContain('"width": 2');
    expect(text).toContain('"op": "texture"');
    expect(text).toContain('"pattern": "mottle"');
    expect(text).toContain('"density": 3');
  });

  it('renders the round-tripped recipe without changing bytes', () => {
    const first = serializeRecipe(parseRecipe(TEXT).recipe);
    const a = renderRecipe(parseRecipe(first).recipe);
    const b = renderRecipe(parseRecipe(serializeRecipe(parseRecipe(first).recipe)).recipe);
    expect(a.warnings).toEqual([]);
    expect(sha256Hex(a.png)).toBe(sha256Hex(b.png));
  });
});
