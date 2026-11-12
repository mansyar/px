/**
 * Shared harness for the lighting suite.
 *
 * Every case goes through `parseRecipe` and `compileRecipe`, so a test cannot
 * pass on an op shape the recipe model rejects, and the rows read back are the
 * slots the canvas actually holds rather than what the pass intended.
 */

import { type CompiledRecipe, compileRecipe } from '../../src/core/compile.js';
import { PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Palette, Recipe } from '../../src/core/recipe/types.js';

/** Two ramped families with unmistakably different tones, plus a flat one. */
export const PALETTE: Palette = {
  iron: { ramp: { outline: '#401010', shadow: '#602020', base: '#a06060', highlight: '#e0a0a0' } },
  steel: { ramp: { outline: '#101820', shadow: '#303840', base: '#8090a0', highlight: '#f0f4f8' } },
  ink: { colors: ['#000000'] },
};

/** A single ramped family, for cases that must not see a second outline. */
export const CLOTH: Palette = {
  cloth: { ramp: { outline: '#000000', shadow: '#440000', base: '#880000', highlight: '#ff0000' } },
};

/** A part as written in a recipe, before defaults are applied. */
export interface RawPart {
  material: string;
  gloss?: string;
  z?: number;
}

export interface CaseOptions {
  width?: number;
  height?: number;
  palette?: Palette;
  parts?: Record<string, RawPart>;
  layers?: Array<{ id: string; ops: unknown[] }>;
  ops?: unknown[];
}

export function parsed(options: CaseOptions = {}): Recipe {
  const recipe = {
    version: '1.1',
    meta: {
      name: 'light',
      width: options.width ?? 8,
      height: options.height ?? 8,
      alpha_mode: 'binary',
    },
    palette: options.palette ?? PALETTE,
    parts: options.parts,
    anchors: {},
    layers: options.layers ?? [{ id: 'base', ops: options.ops ?? [] }],
  };
  return parseRecipe(JSON.stringify(recipe)).recipe;
}

export function compiled(options: CaseOptions = {}): CompiledRecipe {
  return compileRecipe(parsed(options));
}

/** The `PxError` code a thunk throws, or `NO_THROW`. */
export function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof PxError ? error.code : 'NOT_PX';
  }
  return 'NO_THROW';
}

/** The `PxError` a thunk throws, for assertions on message and hint. */
export function errorOf(run: () => unknown): PxError {
  try {
    run();
  } catch (error) {
    if (error instanceof PxError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a PxError, but the call succeeded');
}

const ROLE_LETTERS: Record<string, string> = {
  outline: 'o',
  shadow: 's',
  base: 'b',
  highlight: 'h',
};

function slotName(compiledRecipe: CompiledRecipe, slot: number): string {
  return compiledRecipe.slots.names[slot] ?? '';
}

/** One character per cell: the role letter, or `.` for transparent. */
export function roleRows(compiledRecipe: CompiledRecipe, layerIndex = 0): string[] {
  const layer = compiledRecipe.layers[layerIndex];
  if (layer === undefined) {
    throw new Error(`compiled recipe has no layer ${layerIndex}`);
  }
  const rows: string[] = [];
  for (let y = 0; y < compiledRecipe.height; y += 1) {
    let row = '';
    for (let x = 0; x < compiledRecipe.width; x += 1) {
      const slot = layer.canvas.get(x, y);
      if (slot === -1) {
        row += '.';
        continue;
      }
      const name = slotName(compiledRecipe, slot);
      const suffix = name.slice(name.lastIndexOf('.') + 1);
      row += ROLE_LETTERS[suffix] ?? suffix.slice(0, 1);
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Two characters per cell — role, then family initial — for cases where two
 * families' roles must be told apart, such as the neighbour outline `rim`
 * borrows.
 */
export function familyRows(compiledRecipe: CompiledRecipe, layerIndex = 0): string[] {
  const layer = compiledRecipe.layers[layerIndex];
  if (layer === undefined) {
    throw new Error(`compiled recipe has no layer ${layerIndex}`);
  }
  const rows: string[] = [];
  for (let y = 0; y < compiledRecipe.height; y += 1) {
    let row = '';
    for (let x = 0; x < compiledRecipe.width; x += 1) {
      const slot = layer.canvas.get(x, y);
      if (slot === -1) {
        row += '..';
        continue;
      }
      const name = slotName(compiledRecipe, slot);
      const dot = name.lastIndexOf('.');
      const family = dot < 0 ? name : name.slice(0, dot);
      const role = name.slice(dot + 1);
      row += `${ROLE_LETTERS[role] ?? role.slice(0, 1)}${family.slice(0, 1)}`;
    }
    rows.push(row);
  }
  return rows;
}

/** Painted pixels in a layer, for ownership and no-op assertions. */
export function paintedCount(compiledRecipe: CompiledRecipe, layerIndex = 0): number {
  const layer = compiledRecipe.layers[layerIndex];
  if (layer === undefined) {
    return 0;
  }
  return layer.canvas.paintedCount();
}

/** Owner index per cell: `.` unowned, otherwise the index in canonical order. */
export function ownerRows(compiledRecipe: CompiledRecipe, layerIndex = 0): string[] {
  const layer = compiledRecipe.layers[layerIndex];
  if (layer === undefined) {
    throw new Error(`compiled recipe has no layer ${layerIndex}`);
  }
  const rows: string[] = [];
  for (let y = 0; y < compiledRecipe.height; y += 1) {
    let row = '';
    for (let x = 0; x < compiledRecipe.width; x += 1) {
      const owner = layer.canvas.ownerAt(x, y);
      row += owner < 0 ? '.' : String(owner);
    }
    rows.push(row);
  }
  return rows;
}
