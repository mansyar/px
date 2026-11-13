/**
 * AC-6, AC-7: a role may name a tone, and every 1.3 option is refused under 1.2
 * with a message naming the version to set.
 *
 * The gate has to be ordered rather than equality-based: 1.3 is a superset of
 * 1.2, so a 1.2 feature such as `fit: "region"` must keep working at 1.3 while
 * the new options are refused below it.
 */

import { describe, expect, it } from 'vitest';
import { buildSlotTable } from '../../src/core/palette.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Palette } from '../../src/core/recipe/types.js';

const TONES = {
  t0: '#e8d8bc',
  t1: '#c8b498',
  t2: '#a89074',
  t3: '#886c50',
  t4: '#684c34',
  t5: '#48301c',
};

function recipe(version: string, ops: unknown[], palette: unknown): string {
  return JSON.stringify({
    version,
    meta: { name: 'v13', width: 16, height: 16, alpha_mode: 'binary' },
    palette,
    anchors: {},
    layers: [{ id: 'base', ops }],
    parts: { body: { material: 'wood' } },
  });
}

const RECT = { op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'wood.base', part: 'body' };
const LIGHT = { op: 'light', angle: 'top-left', form: 'round', ao: false, rim: 'none' };

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as { code?: string }).code ?? 'no-code';
  }
  return 'no-error';
}

describe('schema 1.3', () => {
  it('resolves a role that names a tone', () => {
    const palette = { wood: { ramp: { ...TONES, base: 't3' } } } as unknown as Palette;
    const slots = buildSlotTable(palette);
    const base = slots.resolve('wood.base');
    expect(base).toBeDefined();
    expect(slots.rgba[base as number]).toEqual({
      r: 0x88,
      g: 0x6c,
      b: 0x50,
      a: 255,
    });
  });

  it('refuses a role naming a tone the family does not declare', () => {
    const palette = { wood: { ramp: { ...TONES, base: 't9' } } } as unknown as Palette;
    expect(() => buildSlotTable(palette)).toThrow(/t9/);
  });

  it('refuses bands under 1.2 and names 1.3', () => {
    const run = () =>
      parseRecipe(recipe('1.2', [RECT, { ...LIGHT, bands: 3 }], { wood: { ramp: TONES } }));
    expect(codeOf(run)).toBe('E_BAD_VERSION');
    expect(() => run()).toThrow(/1\.3/);
  });

  it('refuses skip and a seam under 1.2', () => {
    for (const op of [
      { ...LIGHT, skip: ['body'] },
      { op: 'auto_outline', color: 'wood.t0', seam: 'wood.t5' },
    ]) {
      expect(codeOf(() => parseRecipe(recipe('1.2', [RECT, op], { wood: { ramp: TONES } })))).toBe(
        'E_BAD_VERSION',
      );
    }
  });

  it('refuses a tone-valued role under 1.2', () => {
    const palette = { wood: { ramp: { ...TONES, base: 't3' } } };
    expect(codeOf(() => parseRecipe(recipe('1.2', [RECT, LIGHT], palette)))).toBe('E_BAD_VERSION');
  });

  it('accepts the new options at 1.3', () => {
    const palette = { wood: { ramp: { ...TONES, base: 't3' } } };
    const ops = [RECT, { ...LIGHT, bands: 3, skip: ['body'] }];
    expect(codeOf(() => parseRecipe(recipe('1.3', ops, palette)))).toBe('no-error');
  });

  it('still accepts a 1.2 option at 1.3', () => {
    const ops = [
      { op: 'texture', pattern: 'stipple', color: 'wood.t5', fit: 'region', part: 'body' },
      LIGHT,
    ];
    expect(codeOf(() => parseRecipe(recipe('1.3', ops, { wood: { ramp: TONES } })))).toBe(
      'no-error',
    );
  });

  it('still refuses a 1.2 option at 1.1', () => {
    const ops = [
      { op: 'texture', pattern: 'stipple', color: 'wood.t5', fit: 'region', part: 'body' },
    ];
    expect(codeOf(() => parseRecipe(recipe('1.1', ops, { wood: { ramp: TONES } })))).toBe(
      'E_BAD_VERSION',
    );
  });
});
