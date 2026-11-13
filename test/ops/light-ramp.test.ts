/**
 * AC-9: a shading pass asked for roles on a palette that has none is an error,
 * not a silent no-op.
 *
 * The refusal already exists below the op: `rampError` in `ops/pass.ts` raises
 * `E_NO_RAMP` while the part's role is resolved, so `light` never gets the
 * chance to skip quietly. These tests pin that contract for the forms this
 * track relies on, because Phase 6 puts a `facing` on the scene's roof planes
 * and a silent skip there would look like a shading bug.
 *
 * Note the current behaviour is stricter than the phase's design note first
 * proposed: even `form: "flat"` refuses a flat family. That is recorded in the
 * evidence as a deviation, not changed here.
 */

import { describe, expect, it } from 'vitest';
import { type CompiledRecipe, compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Palette } from '../../src/core/recipe/types.js';

const FLAT: Palette = { ink: { colors: ['#808080'] } };
const RAMP: Palette = {
  ink: { ramp: { outline: '#000000', shadow: '#404040', base: '#808080', highlight: '#c0c0c0' } },
};

const BODY = { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'ink.base', part: 'body' };

function lightOp(form: 'flat' | 'bevel' | 'round') {
  return {
    op: 'light',
    angle: 'top-left',
    form,
    ao: true,
    cast: null,
    cast_offset: 1,
    rim: 'none',
  };
}

function compileWith(palette: Palette, form: 'flat' | 'bevel' | 'round'): CompiledRecipe {
  const body = palette.ink && 'colors' in palette.ink ? { ...BODY, color: 'ink.0' } : BODY;
  const recipe = {
    version: '1.1',
    meta: { name: 'light', width: 8, height: 8, alpha_mode: 'binary' },
    palette,
    anchors: {},
    layers: [{ id: 'base', ops: [body, lightOp(form)] }],
    parts: { body: { material: 'ink' } },
  };
  return compileRecipe(parseRecipe(JSON.stringify(recipe)).recipe);
}

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as { code?: string }).code ?? 'no-code';
  }
  return 'no-error';
}

describe('light on a flat family', () => {
  it('refuses round bands', () => {
    expect(codeOf(() => compileWith(FLAT, 'round'))).toBe('E_NO_RAMP');
  });

  it('refuses a bevel', () => {
    expect(codeOf(() => compileWith(FLAT, 'bevel'))).toBe('E_NO_RAMP');
  });

  it('refuses even flat form, which is stricter than the design note proposed', () => {
    expect(codeOf(() => compileWith(FLAT, 'flat'))).toBe('E_NO_RAMP');
  });

  it('shades a ramp family without error', () => {
    expect(codeOf(() => compileWith(RAMP, 'round'))).toBe('no-error');
  });
});
