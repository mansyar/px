/**
 * Shared fixtures for the intent-driven-pass tests. Each case writes a project
 * style into a private temp dir so `parseRecipe` can resolve `"style":
 * "@project"`, then returns a recipe whose design is already validated.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Recipe } from '../../src/core/recipe/types.js';

const STYLE = {
  allowed_ramps: ['steel', 'wood'],
  edge_vocabulary: ['none', 'outline', 'shadow', 'highlight'],
  default_light: 'top-left',
  min_contrast: 2,
  value_rules: {},
};

export interface IntentCase {
  dir: string;
  recipe: Recipe;
  cleanup(): void;
}

export interface IntentOptions {
  design?: Record<string, unknown> | null;
  ops?: unknown[];
  parts?: Record<string, unknown>;
  palette?: Record<string, unknown>;
  style?: Record<string, unknown>;
}

const STEEL = {
  ramp: {
    outline: '#141414',
    shadow: '#4c4c4c',
    base: '#8c8c8c',
    highlight: '#e0e0e0',
  },
};

const WOOD = {
  ramp: {
    outline: '#2b1a0f',
    shadow: '#7a4a20',
    base: '#b88040',
    highlight: '#e8c080',
  },
};

/** A fresh temp dir with a closed-vocabulary style file. */
export function makeIntentDir(overrides: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'px-intent-pass-'));
  writeFileSync(join(dir, 'px.style.json'), JSON.stringify({ ...STYLE, ...overrides }));
  return dir;
}

export function removeIntentDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

/** A two-part recipe with a design, parsed and validated against the style. */
export function intentCase(options: IntentOptions = {}): IntentCase {
  const dir = makeIntentDir(options.style);
  const defaultDesign = {
    subject: 'two-block',
    light: 'top-left',
    hierarchy: ['body', 'trim'],
    values: { body: 3, trim: 5 },
    edges: { silhouette: 'outline', material: 'shadow', detail: 'highlight' },
    materials: ['steel', 'wood'],
    style: '@project',
  };
  const design = options.design === null ? undefined : { ...defaultDesign, ...options.design };
  const ops = options.ops ?? [
    { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'steel.base', part: 'body' },
    { op: 'rect', x: 5, y: 1, w: 2, h: 4, color: 'wood.base', part: 'trim' },
  ];
  const raw = {
    version: '1.3',
    meta: { name: 'intent', width: 8, height: 8, alpha_mode: 'binary' },
    ...(design === undefined ? {} : { design }),
    palette: options.palette ?? { steel: STEEL, wood: WOOD },
    parts: options.parts ?? {
      body: { material: 'steel', z: 1 },
      trim: { material: 'wood', z: 2 },
    },
    anchors: {},
    layers: [{ id: 'base', ops }],
  };
  const recipe = parseRecipe(JSON.stringify(raw), { baseDir: dir }).recipe;
  return { dir, recipe, cleanup: () => removeIntentDir(dir) };
}
