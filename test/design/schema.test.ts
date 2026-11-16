/**
 * FR-1/FR-17: the design block is a closed 1.2+ shape. The version gate rejects
 * it on older recipes outright — promoting the version would change rendered
 * bytes the moment a pass keys on it.
 */

import { describe, expect, it } from 'vitest';
import { ERROR_HINTS } from '../../src/core/errors.js';
import { normalizeRecipe } from '../../src/core/recipe/normalize.js';

function design() {
  return {
    subject: 'lantern',
    light: 'top-left',
    hierarchy: ['body', 'flame'],
    values: { body: 3, flame: 5 },
    edges: { silhouette: 'hard', material: 'crease', detail: 'soft' },
    materials: ['brass', 'glass'],
    style: '@project',
  };
}

function rawRecipe(version: string | number, declared?: unknown) {
  return {
    version,
    meta: { name: 'v', width: 8, height: 8, alpha_mode: 'binary' },
    palette: { ink: { colors: ['#ffffff'] } },
    parts: { body: { material: 'ink' }, flame: { material: 'ink' } },
    anchors: {},
    layers: [
      { id: 'base', ops: [{ op: 'rect', x: 0, y: 0, w: 1, h: 1, color: 'ink.0', part: 'body' }] },
    ],
    ...(declared === undefined ? {} : { design: declared }),
  };
}

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as { code?: string }).code ?? 'THREW';
  }
  return 'NO_ERROR';
}

describe('design schema', () => {
  it('normalizes a design block at version 1.2', () => {
    const parsed = normalizeRecipe(rawRecipe('1.2', design()));
    expect(parsed.recipe.design).toEqual(design());
  });

  it('accepts design at version 1.3 too', () => {
    expect(normalizeRecipe(rawRecipe('1.3', design())).recipe.design).toBeDefined();
  });

  it.each([1, '1.0', '1.1'])('rejects design under version %s and points at 1.2', (version) => {
    let message = '';
    let hint = '';
    try {
      normalizeRecipe(rawRecipe(version, design()));
    } catch (error) {
      const px = error as { code?: string; message?: string; hint?: string };
      expect(px.code).toBe('E_BAD_VERSION');
      message = px.message ?? '';
      hint = px.hint ?? '';
    }
    expect(`${message} ${hint}`).toContain('1.2');
  });

  it('does not promote the version of a rejected recipe', () => {
    expect(codeOf(() => normalizeRecipe(rawRecipe('1.1', design())))).toBe('E_BAD_VERSION');
  });

  it('leaves recipes without a design block untouched', () => {
    const parsed = normalizeRecipe(rawRecipe('1.1'));
    expect(parsed.recipe.design).toBeUndefined();
    expect('design' in parsed.recipe).toBe(false);
  });

  it('rejects unknown design keys', () => {
    expect(codeOf(() => normalizeRecipe(rawRecipe('1.2', { ...design(), stray: 1 })))).toBe(
      'E_BAD_PARAM',
    );
  });

  it('rejects an unknown light with E_INTENT_LIGHT', () => {
    expect(
      codeOf(() => normalizeRecipe(rawRecipe('1.2', { ...design(), light: 'sideways' }))),
    ).toBe('E_INTENT_LIGHT');
  });

  it.each([0, 6, 2.5, '4'])('rejects the out-of-range value %s with E_INTENT_VALUE', (value) => {
    expect(
      codeOf(() => normalizeRecipe(rawRecipe('1.2', { ...design(), values: { body: value } }))),
    ).toBe('E_INTENT_VALUE');
  });

  it('rejects an empty hierarchy', () => {
    expect(codeOf(() => normalizeRecipe(rawRecipe('1.2', { ...design(), hierarchy: [] })))).toBe(
      'E_BAD_PARAM',
    );
  });

  it('rejects an unknown edge class', () => {
    expect(
      codeOf(() =>
        normalizeRecipe(
          rawRecipe('1.2', { ...design(), edges: { silhouette: 'hard', glow: 'soft' } }),
        ),
      ),
    ).toBe('E_BAD_PARAM');
  });

  it('keeps the baseline version hint current', () => {
    expect(ERROR_HINTS.E_BAD_VERSION).toContain('1.2');
  });
});
