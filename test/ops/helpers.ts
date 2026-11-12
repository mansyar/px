/**
 * Shared harness for the Phase 3 op tests.
 *
 * Ops are exercised through the real path — JSON recipe, parser, compiler — so
 * a test cannot pass on an op that the recipe model rejects.
 */

import { SlotCanvas } from '../../src/core/canvas.js';
import { type CompiledRecipe, compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Palette, Recipe } from '../../src/core/recipe/types.js';

/** One flat family: enough for geometry and fill tests. */
export const INK: Palette = { ink: { colors: ['#ffffff'] } };

export const INK_ALT: Palette = {
  ink: { colors: ['#ffffff'] },
  alt: { colors: ['#ff00ff'] },
};

/** A pale family and a full ramp family, for the post-pass tests. */
export const SHADED: Palette = {
  cloth: { ramp: { outline: '#000000', shadow: '#440000', base: '#880000', highlight: '#ff0000' } },
  skin: { colors: ['#88ff88'] },
};

export interface RecipeOptions {
  width?: number;
  height?: number;
  palette?: Palette;
  layers?: Array<{ id: string; ops: unknown[] }>;
}

export function recipeOf(ops: unknown[], options: RecipeOptions = {}): Recipe {
  const recipe = {
    version: 1,
    meta: {
      name: 'ops',
      width: options.width ?? 16,
      height: options.height ?? 16,
      alpha_mode: 'binary',
    },
    palette: options.palette ?? INK,
    anchors: {},
    layers: options.layers ?? [{ id: 'base', ops }],
  };
  return parseRecipe(JSON.stringify(recipe)).recipe;
}

export interface CompiledOps {
  compiled: CompiledRecipe;
  recipe: Recipe;
}

export function compileOps(ops: unknown[], options: RecipeOptions = {}): CompiledOps {
  const recipe = recipeOf(ops, options);
  return { compiled: compileRecipe(recipe), recipe };
}

/** The base layer, which is what most ops write. */
export function base(compiled: CompiledRecipe): SlotCanvas {
  const layer = compiled.layers[0];
  if (layer === undefined) {
    throw new Error('compiled recipe has no layers');
  }
  return layer.canvas;
}

/** `#` for painted, `.` for transparent — the geometry view. */
export function paint(canvas: SlotCanvas): string[] {
  const rows: string[] = [];
  for (let y = 0; y < canvas.height; y += 1) {
    let row = '';
    for (let x = 0; x < canvas.width; x += 1) {
      row += canvas.get(x, y) === -1 ? '.' : '#';
    }
    rows.push(row);
  }
  return rows;
}

const ROLE_LETTERS: Record<string, string> = {
  outline: 'o',
  shadow: 's',
  base: 'b',
  highlight: 'h',
};

/** One character per cell: the role letter, or `.` for transparent. */
export function roleRows(compiled: CompiledRecipe, layerIndex = 0): string[] {
  const layer = compiled.layers[layerIndex];
  if (layer === undefined) {
    throw new Error(`compiled recipe has no layer ${layerIndex}`);
  }
  const rows: string[] = [];
  for (let y = 0; y < compiled.height; y += 1) {
    let row = '';
    for (let x = 0; x < compiled.width; x += 1) {
      const slot = layer.canvas.get(x, y);
      if (slot === -1) {
        row += '.';
        continue;
      }
      const name = compiled.slots.names[slot] ?? '';
      const suffix = name.slice(name.lastIndexOf('.') + 1);
      row += ROLE_LETTERS[suffix] ?? suffix.slice(0, 1);
    }
    rows.push(row);
  }
  return rows;
}

export function countPainted(canvas: SlotCanvas): number {
  let count = 0;
  for (const slot of canvas.slots) {
    if (slot !== -1) {
      count += 1;
    }
  }
  return count;
}

/**
 * A canvas that remembers how often each coordinate was written. Used to prove
 * an op writes a pixel once, which is the seam rule for mirror and polygon.
 */
export class CountingCanvas extends SlotCanvas {
  readonly writes = new Map<string, number>();

  override set(x: number, y: number, slot: number): boolean {
    const written = super.set(x, y, slot);
    if (written) {
      const key = `${String(x)},${String(y)}`;
      this.writes.set(key, (this.writes.get(key) ?? 0) + 1);
    }
    return written;
  }

  maxWrites(): number {
    let max = 0;
    for (const count of this.writes.values()) {
      max = Math.max(max, count);
    }
    return max;
  }
}
