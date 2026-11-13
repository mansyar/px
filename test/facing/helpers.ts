import type { CompiledRecipe } from '../../src/core/compile.js';
import { compileRecipe } from '../../src/core/compile.js';
import { TRANSPARENT_SLOT } from '../../src/core/palette.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Recipe } from '../../src/core/recipe/types.js';

/**
 * Shared harness for the facing tests.
 *
 * Every case goes through `parseRecipe`, so what is asserted is the surface a
 * recipe author actually gets — canonical serialisation, defaults and errors
 * included — and then through `compileRecipe`, so the tone asserted is the tone
 * the renderer would draw.
 */

export const PALETTE = {
  steel: {
    ramp: {
      outline: '#101820',
      shadow: '#303840',
      base: '#8090a0',
      highlight: '#f0f4f8',
    },
  },
  ink: { colors: ['#000000'] },
};

/** A tone-only family: four ladder steps, three shading roles. */
export const TONES = {
  clay: {
    ramp: {
      t0: '#f4e6d8',
      t1: '#c8a888',
      t2: '#8a6a4a',
      t3: '#3a2a1a',
    },
  },
};

export interface RawPart {
  material: string;
  gloss?: string;
  z?: number;
  facing?: unknown;
}

export interface CaseOptions {
  width?: number;
  height?: number;
  palette?: Record<string, unknown>;
  parts?: Record<string, RawPart>;
  ops?: unknown[];
}

export function recipeOf(options: CaseOptions): Recipe {
  const recipe = {
    version: '1.1',
    meta: {
      name: 'plane',
      width: options.width ?? 8,
      height: options.height ?? 8,
      alpha_mode: 'binary',
    },
    palette: options.palette ?? PALETTE,
    parts: options.parts ?? {},
    anchors: {},
    layers: [{ id: 'base', ops: options.ops ?? [] }],
  };
  return parseRecipe(JSON.stringify(recipe)).recipe;
}

export function compiled(options: CaseOptions): CompiledRecipe {
  return compileRecipe(recipeOf(options));
}

const ROLE_LETTERS: Record<string, string> = {
  outline: 'o',
  shadow: 's',
  base: 'b',
  highlight: 'h',
};

/** One character per cell: the ramp role of its slot, `.` for transparent. */
export function rows(compiled: CompiledRecipe, layerIndex = 0): string[] {
  const canvas = compiled.layers[layerIndex]?.canvas;
  if (canvas === undefined) {
    throw new Error(`no layer at index ${layerIndex}`);
  }
  const out: string[] = [];
  for (let y = 0; y < canvas.height; y += 1) {
    let row = '';
    for (let x = 0; x < canvas.width; x += 1) {
      const slot = canvas.slots[y * canvas.width + x];
      if (slot === undefined || slot === TRANSPARENT_SLOT) {
        row += '.';
        continue;
      }
      const name = compiled.slots.names[slot] ?? '';
      const suffix = name.slice(name.indexOf('.') + 1);
      row += ROLE_LETTERS[suffix] ?? suffix.charAt(0);
    }
    out.push(row);
  }
  return out;
}

/** The slot name at one cell, for tests that care about the exact tone. */
export function slotAt(compiled: CompiledRecipe, x: number, y: number, layerIndex = 0): string {
  const canvas = compiled.layers[layerIndex]?.canvas;
  if (canvas === undefined) {
    throw new Error(`no layer at index ${layerIndex}`);
  }
  const slot = canvas.slots[y * canvas.width + x];
  if (slot === undefined || slot === TRANSPARENT_SLOT) {
    return 'transparent';
  }
  return compiled.slots.names[slot] ?? 'unknown';
}

/** A rect per part, so every part owns its own patch of the canvas. */
export function planeCase(
  parts: Record<string, RawPart>,
  extra: { palette?: Record<string, unknown>; light?: Record<string, unknown> } = {},
): CaseOptions {
  const names = Object.keys(parts).sort();
  const ops: unknown[] = names.map((name, index) => ({
    op: 'rect',
    x: index,
    y: 0,
    w: 1,
    h: 1,
    color: `${parts[name]?.material ?? 'steel'}.base`,
    part: name,
  }));
  ops.push({
    op: 'light',
    form: 'flat',
    ao: false,
    rim: 'none',
    ...extra.light,
  });
  return { parts, palette: extra.palette, ops };
}
