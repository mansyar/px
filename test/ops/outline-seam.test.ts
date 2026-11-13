/**
 * AC-5: a boundary between two parts gets one interior edge tone on the later
 * part only, and a one-pixel ridge keeps the tone it authored.
 *
 * The seam is a colour write: ownership is untouched, so it cannot produce a
 * part-overwrite warning. The pass also has to leave recipes without `seam`
 * byte-identical, which is the last test here.
 */

import { describe, expect, it } from 'vitest';
import { type CompiledRecipe, compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Palette } from '../../src/core/recipe/types.js';

const PALETTE: Palette = {
  ink: { ramp: { outline: '#101010', shadow: '#404040', base: '#808080', highlight: '#c0c0c0' } },
  steel: { ramp: { outline: '#20304a', shadow: '#405070', base: '#8090b0', highlight: '#c0d0e8' } },
};

function compileWith(ops: unknown[]): CompiledRecipe {
  const recipe = {
    version: '1.3',
    meta: { name: 'seam', width: 16, height: 16, alpha_mode: 'binary' },
    palette: PALETTE,
    anchors: {},
    layers: [{ id: 'base', ops }],
    parts: { behind: { material: 'ink', z: 1 }, front: { material: 'steel', z: 2 } },
  };
  return compileRecipe(parseRecipe(JSON.stringify(recipe)).recipe);
}

const BEHIND = { op: 'rect', x: 2, y: 2, w: 7, h: 8, color: 'ink.base', part: 'behind' };
const FRONT = { op: 'rect', x: 9, y: 2, w: 4, h: 8, color: 'steel.base', part: 'front' };

function slotOf(run: CompiledRecipe, name: string): number {
  return run.slots.names.indexOf(name);
}

function pixel(run: CompiledRecipe, x: number, y: number): number {
  return run.flattened[y * run.width + x] as number;
}

describe('auto_outline seam', () => {
  it('paints the boundary on the later part only', () => {
    const run = compileWith([
      BEHIND,
      FRONT,
      { op: 'auto_outline', where: 'outer', color: 'ink.outline', seam: 'steel.outline' },
    ]);
    expect(pixel(run, 9, 4)).toBe(slotOf(run, 'steel.outline'));
    expect(pixel(run, 8, 4)).toBe(slotOf(run, 'ink.base'));
  });

  it('keeps ownership, so the seam cannot overwrite a part', () => {
    const run = compileWith([
      BEHIND,
      FRONT,
      { op: 'auto_outline', where: 'outer', color: 'ink.outline', seam: 'steel.outline' },
    ]);
    expect(run.owners[4 * run.width + 9]).toBe(
      run.parts.findIndex((part) => part.name === 'front'),
    );
    expect(run.warnings.filter((warning) => warning.code === 'W_PART_OVERWRITE')).toHaveLength(0);
  });

  it('leaves a one-pixel ridge on its own tone', () => {
    const run = compileWith([
      BEHIND,
      { op: 'rect', x: 10, y: 2, w: 1, h: 8, color: 'steel.base', part: 'front' },
      { op: 'auto_outline', where: 'outer', color: 'ink.outline', seam: 'steel.outline' },
    ]);
    expect(pixel(run, 10, 4)).toBe(slotOf(run, 'steel.base'));
  });

  it('writes nothing when seam is absent', () => {
    const run = compileWith([BEHIND, FRONT, { op: 'auto_outline', color: 'ink.outline' }]);
    expect(pixel(run, 9, 4)).toBe(slotOf(run, 'steel.base'));
  });
});
