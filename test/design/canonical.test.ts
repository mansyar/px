/**
 * FR-16/NFR-6: design has one canonical byte form, sits after meta before
 * palette, feeds the recipe hash, and is absent for recipes that never had one.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { canonicalRecipe, serializeRecipe } from '../../src/core/recipe/serialize.js';
import type { Design, Recipe } from '../../src/core/recipe/types.js';
import { recipeHash } from '../../src/meta/index.js';

const dirs: string[] = [];

function makeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'px-canonical-'));
  dirs.push(dir);
  writeFileSync(
    join(dir, 'px.style.json'),
    JSON.stringify({
      allowed_ramps: ['brass'],
      edge_vocabulary: ['hard', 'crease', 'soft'],
      default_light: 'top-left',
      min_contrast: 2,
      value_rules: {},
    }),
  );
  return dir;
}

function baseRecipe(design?: Design): Recipe {
  return {
    version: '1.2' as const,
    meta: { name: 'v', width: 8, height: 8, alphaMode: 'binary' },
    ...(design === undefined ? {} : { design }),
    palette: {
      ink: {
        ramp: {
          outline: '#000000',
          shadow: '#333333',
          base: '#888888',
          highlight: '#ffffff',
        },
      },
    },
    parts: { body: { material: 'ink', gloss: 'matte', z: 0 } },
    anchors: {},
    layers: [
      {
        id: 'base',
        ops: [{ op: 'rect', x: 0, y: 0, w: 1, h: 1, color: 'ink.base', part: 'body' }],
      },
    ],
  };
}

function design(): Design {
  return {
    subject: 'lantern',
    light: 'top-left',
    hierarchy: ['body'],
    values: { body: 3 },
    edges: { silhouette: 'hard', material: 'crease', detail: 'soft' },
    materials: ['brass'],
    style: '@project',
  };
}

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

describe('canonical design serialization', () => {
  it('writes design in the fixed order between meta and palette', () => {
    const text = serializeRecipe(baseRecipe(design()));
    const keys = Object.keys(JSON.parse(text) as Record<string, unknown>);
    expect(keys).toEqual(['version', 'meta', 'design', 'palette', 'parts', 'anchors', 'layers']);
    const written = (JSON.parse(text) as { design: Record<string, unknown> }).design;
    expect(Object.keys(written)).toEqual([
      'subject',
      'light',
      'hierarchy',
      'values',
      'edges',
      'materials',
      'style',
    ]);
    expect(Object.keys(written.edges as Record<string, unknown>)).toEqual([
      'silhouette',
      'material',
      'detail',
    ]);
  });

  it('round-trips byte-identically through a parse/serialize cycle', () => {
    const dir = makeDir();
    const text = serializeRecipe(baseRecipe(design()));
    const parsed = parseRecipe(text, { baseDir: dir });
    expect(serializeRecipe(parsed.recipe)).toBe(text);
  });

  it('writes value keys in sorted order regardless of insertion order', () => {
    const withValues = design();
    withValues.values = { wing: 5, body: 1 };
    const canonical = canonicalRecipe(baseRecipe(withValues));
    const written = canonical.design as { values: Record<string, number> };
    expect(Object.keys(written.values)).toEqual(['body', 'wing']);
  });

  it('does not emit a design key when the recipe has none', () => {
    const canonical = canonicalRecipe(baseRecipe());
    expect(Object.keys(canonical)).toEqual([
      'version',
      'meta',
      'palette',
      'parts',
      'anchors',
      'layers',
    ]);
  });

  it('feeds the recipe hash', () => {
    const plain = baseRecipe();
    const withDesign = baseRecipe(design());
    expect(recipeHash(withDesign)).not.toBe(recipeHash(plain));
    const changed = design();
    changed.subject = 'beacon';
    expect(recipeHash(baseRecipe(changed))).not.toBe(recipeHash(withDesign));
  });

  it('keeps the hash stable across a canonical round trip', () => {
    const dir = makeDir();
    const text = serializeRecipe(baseRecipe(design()));
    const parsed = parseRecipe(text, { baseDir: dir });
    expect(recipeHash(parsed.recipe)).toBe(recipeHash(baseRecipe(design())));
  });
});
