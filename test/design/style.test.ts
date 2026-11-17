/**
 * FR-3/AC-3: a design block inherits its project style from an explicitly
 * supplied base directory. No global cache, no ambient cwd in the library.
 */

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseRecipe } from '../../src/core/recipe/parse.js';

const dirs: string[] = [];

function makeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'px-style-'));
  dirs.push(dir);
  return dir;
}

function writeStyle(dir: string, file = 'px.style.json', overrides: Record<string, unknown> = {}) {
  writeFileSync(
    join(dir, file),
    JSON.stringify({
      allowed_ramps: ['brass', 'glass'],
      edge_vocabulary: ['none', 'outline', 'shadow', 'highlight'],
      default_light: 'bottom-right',
      min_contrast: 2,
      value_rules: { hero: 5 },
      ...overrides,
    }),
  );
}

function recipe(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    version: '1.2',
    meta: { name: 'v', width: 8, height: 8, alpha_mode: 'binary' },
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
    parts: { body: { material: 'ink' } },
    design: {
      subject: 'lantern',
      hierarchy: ['body'],
      values: { body: 3 },
      edges: { silhouette: 'outline', material: 'shadow', detail: 'highlight' },
      materials: ['brass'],
      style: '@project',
      ...overrides,
    },
    anchors: {},
    layers: [
      {
        id: 'base',
        ops: [{ op: 'rect', x: 0, y: 0, w: 1, h: 1, color: 'ink.base', part: 'body' }],
      },
    ],
  });
}

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as { code?: string }).code ?? 'THREW';
  }
  return 'NO_ERROR';
}

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

describe('project style inheritance', () => {
  it('fills an omitted light with default_light', () => {
    const dir = makeDir();
    writeStyle(dir);
    const parsed = parseRecipe(recipe(), { baseDir: dir });
    expect(parsed.recipe.design?.light).toBe('bottom-right');
  });

  it('lets an explicit design field override the style default', () => {
    const dir = makeDir();
    writeStyle(dir);
    const parsed = parseRecipe(recipe({ light: 'top-left' }), { baseDir: dir });
    expect(parsed.recipe.design?.light).toBe('top-left');
  });

  it('exposes the resolved style and its path', () => {
    const dir = makeDir();
    writeStyle(dir);
    const parsed = parseRecipe(recipe(), { baseDir: dir });
    expect(parsed.design?.style.allowedRamps).toEqual(['brass', 'glass']);
    expect(parsed.design?.style.minContrast).toBe(2);
    expect(parsed.design?.stylePath).toBe(join(dir, 'px.style.json'));
  });

  it('raises E_STYLE_MISSING naming the path and how to create it', () => {
    const dir = makeDir();
    let message = '';
    let hint = '';
    try {
      parseRecipe(recipe(), { baseDir: dir });
    } catch (error) {
      const px = error as { code?: string; message?: string; hint?: string };
      expect(px.code).toBe('E_STYLE_MISSING');
      message = px.message ?? '';
      hint = px.hint ?? '';
    }
    expect(message).toContain(join(dir, 'px.style.json'));
    expect(hint).toContain('px.style.json');
    expect(existsSync(join(dir, 'px.style.json'))).toBe(false);
  });

  it('resolves an explicit style path against baseDir, not cwd', () => {
    const other = makeDir();
    writeStyle(other, 'studio.style.json', { default_light: 'top-right' });
    const parsed = parseRecipe(recipe({ style: 'studio.style.json' }), { baseDir: other });
    expect(parsed.recipe.design?.light).toBe('top-right');
    expect(parsed.design?.stylePath).toBe(join(other, 'studio.style.json'));
  });

  it('is deterministic across base directories', () => {
    const first = makeDir();
    const second = makeDir();
    writeStyle(first, 'px.style.json', { default_light: 'top-left' });
    writeStyle(second, 'px.style.json', { default_light: 'bottom-left' });
    expect(parseRecipe(recipe(), { baseDir: first }).recipe.design?.light).toBe('top-left');
    expect(parseRecipe(recipe(), { baseDir: second }).recipe.design?.light).toBe('bottom-left');
    expect(parseRecipe(recipe(), { baseDir: first }).recipe.design?.light).toBe('top-left');
  });

  it('reports a required field that is absent after resolution', () => {
    const dir = makeDir();
    writeStyle(dir, 'px.style.json', { default_light: undefined });
    expect(codeOf(() => parseRecipe(recipe(), { baseDir: dir }))).toBe('E_INTENT_LIGHT');
  });

  it('rejects malformed style JSON with the path in the message', () => {
    const dir = makeDir();
    const path = join(dir, 'px.style.json');
    writeFileSync(path, '{ not json');
    let message = '';
    try {
      parseRecipe(recipe(), { baseDir: dir });
    } catch (error) {
      message = (error as { message?: string }).message ?? '';
    }
    expect(message).toContain(path);
  });

  it('rejects unknown style keys', () => {
    const dir = makeDir();
    writeStyle(dir, 'px.style.json', { surprise: true });
    expect(codeOf(() => parseRecipe(recipe(), { baseDir: dir }))).toBe('E_BAD_PARAM');
  });
});
