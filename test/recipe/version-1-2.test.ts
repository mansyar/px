/**
 * AC-14: an option introduced at 1.2 is rejected under 1.1 with a message that
 * names the version to set. Silently accepting it would mean the same document
 * compiles to different pixels depending on which build reads it.
 */

import { describe, expect, it } from 'vitest';
import { parseRecipe } from '../../src/core/recipe/parse.js';

function recipe(version: string, fit: string) {
  return JSON.stringify({
    version,
    meta: { name: 'v', width: 8, height: 8, alpha_mode: 'binary' },
    palette: { ink: { colors: ['#ffffff'] } },
    anchors: {},
    layers: [{ id: 'base', ops: [{ op: 'texture', part: 'leg', pattern: 'stipple', fit }] }],
    parts: { leg: { material: 'ink' } },
  });
}

describe('schema 1.2', () => {
  it('rejects region fit under 1.1 and names 1.2', () => {
    try {
      parseRecipe(recipe('1.1', 'region'));
      throw new Error('should have thrown');
    } catch (error) {
      const px = error as { code?: string; message?: string; hint?: string };
      expect(px.code).toBe('E_BAD_VERSION');
      expect(`${px.message} ${px.hint}`).toContain('1.2');
    }
  });

  it('accepts region fit under 1.2', () => {
    expect(() => parseRecipe(recipe('1.2', 'region'))).not.toThrow();
  });

  it('keeps full fit legal under 1.1', () => {
    expect(() => parseRecipe(recipe('1.1', 'full'))).not.toThrow();
  });

  it('rejects a derived palette under 1.1', () => {
    const document = JSON.parse(recipe('1.1', 'full')) as Record<string, unknown>;
    document.palette = { wood: { derive: { base: '#8a5a2b', stops: 5 } } };
    expect(() => parseRecipe(JSON.stringify(document))).toThrow(/1\.2/);
  });

  it('rejects stroke corner and cap under 1.1', () => {
    for (const option of [{ corner: 'round' }, { cap: 'round' }]) {
      const document = JSON.parse(recipe('1.1', 'full')) as Record<string, unknown>;
      (document.layers as Array<{ ops: unknown[] }>)[0]!.ops = [
        {
          op: 'stroke',
          path: [
            [1, 1],
            [4, 4],
          ],
          color: 'ink.0',
          ...option,
        },
      ];
      expect(() => parseRecipe(JSON.stringify(document))).toThrow(/1\.2/);
    }
  });
});
