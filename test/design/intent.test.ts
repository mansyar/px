/**
 * FR-4: intent errors are raised at parse time with actionable hints. The
 * error envelope keeps the engine's code/message/hint/op_index shape.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { errorPayload, type PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';

const dirs: string[] = [];

function makeDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'px-intent-'));
  dirs.push(dir);
  return dir;
}

function writeStyle(dir: string) {
  writeFileSync(
    join(dir, 'px.style.json'),
    JSON.stringify({
      allowed_ramps: ['brass', 'glass'],
      edge_vocabulary: ['none', 'outline', 'shadow', 'highlight'],
      default_light: 'top-left',
      min_contrast: 2,
      value_rules: { hero: 5 },
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
      light: 'top-left',
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

function failure(run: () => unknown): PxError & { code: string; message: string; hint: string } {
  try {
    run();
  } catch (error) {
    const px = error as PxError & { code: string; message: string; hint: string };
    expect(typeof px.code).toBe('string');
    expect(typeof px.message).toBe('string');
    expect(typeof px.hint).toBe('string');
    return px;
  }
  throw new Error('expected an intent error');
}

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

describe('parse-time intent validation', () => {
  it('accepts a fully valid design', () => {
    const dir = makeDir();
    writeStyle(dir);
    expect(() => parseRecipe(recipe(), { baseDir: dir })).not.toThrow();
  });

  it('rejects an unknown light with the legal list', () => {
    const dir = makeDir();
    writeStyle(dir);
    const error = failure(() => parseRecipe(recipe({ light: 'diagonal' }), { baseDir: dir }));
    expect(error.code).toBe('E_INTENT_LIGHT');
    expect(error.message).toContain('diagonal');
    expect(error.hint).toContain('top-right');
    expect(errorPayload(error).code).toBe('E_INTENT_LIGHT');
  });

  it('rejects an unknown edge treatment naming the style file', () => {
    const dir = makeDir();
    writeStyle(dir);
    const error = failure(() =>
      parseRecipe(
        recipe({ edges: { silhouette: 'jagged', material: 'shadow', detail: 'highlight' } }),
        { baseDir: dir },
      ),
    );
    expect(error.code).toBe('E_INTENT_EDGE');
    expect(error.message).toContain('jagged');
    expect(error.hint).toContain('none, outline, shadow, highlight');
  });

  it('rejects a hierarchy entry that names an undeclared part', () => {
    const dir = makeDir();
    writeStyle(dir);
    const error = failure(() =>
      parseRecipe(recipe({ hierarchy: ['body', 'wing'] }), { baseDir: dir }),
    );
    expect(error.code).toBe('E_INTENT_HIERARCHY');
    expect(error.message).toContain('wing');
  });

  it('rejects a value that names an undeclared part', () => {
    const dir = makeDir();
    writeStyle(dir);
    const error = failure(() =>
      parseRecipe(recipe({ values: { body: 3, wing: 4 } }), { baseDir: dir }),
    );
    expect(error.code).toBe('E_INTENT_HIERARCHY');
    expect(error.message).toContain('wing');
  });

  it.each([0, 6, 2.5, '4'])('rejects out-of-domain value %s', (value) => {
    const dir = makeDir();
    writeStyle(dir);
    const error = failure(() => parseRecipe(recipe({ values: { body: value } }), { baseDir: dir }));
    expect(error.code).toBe('E_INTENT_VALUE');
  });

  it('rejects an unknown ramp naming the style file', () => {
    const dir = makeDir();
    writeStyle(dir);
    const error = failure(() => parseRecipe(recipe({ materials: ['velvet'] }), { baseDir: dir }));
    expect(error.code).toBe('E_INTENT_RAMP');
    expect(error.message).toContain('velvet');
    expect(error.hint).toContain(join(dir, 'px.style.json'));
    expect(error.hint).toContain('brass');
  });

  it('reports a missing style file before validating intent', () => {
    const dir = makeDir();
    const error = failure(() => parseRecipe(recipe(), { baseDir: dir }));
    expect(error.code).toBe('E_STYLE_MISSING');
    expect(error.message).toContain(join(dir, 'px.style.json'));
  });
});
