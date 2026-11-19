import { describe, expect, it } from 'vitest';
import { compileRecipe, compileRecipeFrames } from '../../src/core/compile.js';
import { PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import { lintBlocks, lintCompiled, lintCompiledFrames } from '../../src/lint/index.js';

interface RecipeOverrides {
  [key: string]: unknown;
}

function recipeText(overrides: RecipeOverrides = {}): string {
  return JSON.stringify({
    version: 1,
    meta: { name: 'test', width: 8, height: 8, alpha_mode: 'binary' },
    palette: { c: { colors: ['#000000', '#ffffff'] } },
    anchors: {},
    layers: [{ id: 'base', ops: [] }],
    ...overrides,
  });
}

function codeOf(run: () => unknown): PxError {
  try {
    run();
  } catch (error) {
    if (error instanceof PxError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected a PxError');
}

describe('canonical serialization', () => {
  it('round-trips a minimal recipe byte for byte', () => {
    const text = serializeRecipe(parseRecipe(recipeText()).recipe);
    const second = serializeRecipe(parseRecipe(text).recipe);
    expect(second).toBe(text);
  });

  it('writes top-level keys in the documented order with two-space indent and one newline', () => {
    const text = serializeRecipe(parseRecipe(recipeText()).recipe);
    const order = ['"version"', '"meta"', '"palette"', '"anchors"', '"layers"'].map((key) =>
      text.indexOf(key),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(text.startsWith('{\n  "version": 1,\n  "meta": {\n    "name": "test"')).toBe(true);
    expect(text.endsWith('}\n')).toBe(true);
    expect(text.includes('\r')).toBe(false);
    expect(text.split('\n').length).toBeGreaterThan(5);
  });

  it('normalizes compact tuples to expanded ops on save and stays stable after that', () => {
    const compact = recipeText({
      layers: [
        {
          id: 'base',
          ops: [
            ['rect', 1, 1, 2, 2, 'c.1'],
            ['line', 0, 0, 3, 3, 'c.0'],
          ],
        },
      ],
    });
    const once = serializeRecipe(parseRecipe(compact).recipe);
    expect(once).toContain('"op": "rect"');
    expect(once).toContain('"op": "line"');
    expect(serializeRecipe(parseRecipe(once).recipe)).toBe(once);
  });

  it('rejects the withdrawn pixel_perfect flag instead of ignoring it', () => {
    const error = codeOf(() =>
      parseRecipe(
        recipeText({
          layers: [
            {
              id: 'base',
              ops: [{ op: 'line', x1: 0, y1: 0, x2: 1, y2: 1, color: 'c.0', pixel_perfect: true }],
            },
          ],
        }),
      ),
    );
    expect(error.code).toBe('E_BAD_PARAM');
    expect(error.message).toContain('pixel_perfect');
  });

  it('emits frames in a fixed position only when present', () => {
    const framed = recipeText({
      version: '1.4',
      frames: [{ id: 'idle', layers: [{ id: 'base', ops: [] }], duration: 100 }],
    });
    const text = serializeRecipe(parseRecipe(framed).recipe);
    const keys = ['"version"', '"meta"', '"palette"', '"anchors"', '"layers"', '"frames"'].map(
      (key) => text.indexOf(key),
    );
    expect(keys).toEqual([...keys].sort((a, b) => a - b));
    expect(text).toContain('"duration": 100');

    const withoutFrames = serializeRecipe(parseRecipe(recipeText({ version: '1.4' })).recipe);
    expect(withoutFrames).not.toContain('"frames"');
    expect(serializeRecipe(parseRecipe(withoutFrames).recipe)).toBe(withoutFrames);
  });

  it('round-trips a v1.4 recipe without frames byte-for-byte', () => {
    const once = serializeRecipe(parseRecipe(recipeText({ version: '1.4' })).recipe);
    expect(serializeRecipe(parseRecipe(once).recipe)).toBe(once);
  });

  it('sorts palette families and ramp roles canonically', () => {
    const text = serializeRecipe(
      parseRecipe(
        recipeText({
          palette: {
            zed: { ramp: { highlight: '#ffffff', base: '#000000' } },
            alpha: { colors: ['#111111'] },
          },
        }),
      ).recipe,
    );
    expect(text.indexOf('"alpha"')).toBeLessThan(text.indexOf('"zed"'));
    expect(text.indexOf('"base"')).toBeLessThan(text.indexOf('"highlight"'));
  });
});

describe('validation', () => {
  it('rejects an unknown recipe version', () => {
    expect(codeOf(() => parseRecipe(recipeText({ version: 2 }))).code).toBe('E_BAD_VERSION');
  });

  it('rejects malformed JSON with a parse error', () => {
    expect(codeOf(() => parseRecipe('{')).code).toBe('E_PARSE');
  });

  it('rejects a canvas outside 8-256', () => {
    for (const width of [7, 257]) {
      const error = codeOf(() =>
        parseRecipe(recipeText({ meta: { name: 't', width, height: 8, alpha_mode: 'binary' } })),
      );
      expect(error.code).toBe('E_BAD_CANVAS');
    }
  });

  it('rejects duplicate layer ids', () => {
    const error = codeOf(() =>
      parseRecipe(
        recipeText({
          layers: [
            { id: 'base', ops: [] },
            { id: 'base', ops: [] },
          ],
        }),
      ),
    );
    expect(error.code).toBe('E_DUPLICATE_LAYER');
    expect(error.hint.length).toBeGreaterThan(10);
  });

  it('rejects an unknown op name with the op index', () => {
    const error = codeOf(() =>
      parseRecipe(recipeText({ layers: [{ id: 'base', ops: [['spray', 0, 0]] }] })),
    );
    expect(error.code).toBe('E_UNKNOWN_OP');
    expect(error.location).toEqual({ layer: 'base', op_index: 0 });
  });

  it('rejects an op parameter that is missing', () => {
    const error = codeOf(() =>
      parseRecipe(
        recipeText({
          layers: [{ id: 'base', ops: [{ op: 'rect', x: 0, y: 0, w: 2, color: 'c.0' }] }],
        }),
      ),
    );
    expect(error.code).toBe('E_MISSING_PARAM');
    expect(error.location?.op_index).toBe(0);
  });

  it('rejects an undeclared slot and names where it appeared', () => {
    const error = codeOf(() =>
      parseRecipe(recipeText({ layers: [{ id: 'base', ops: [['rect', 0, 0, 2, 2, 'c.9']] }] })),
    );
    expect(error.code).toBe('E_UNKNOWN_SLOT');
    expect(error.message).toContain('c.9');
    expect(error.message).toContain('op 0');
    expect(error.location?.layer).toBe('base');
  });

  it('rejects anomalous layers with a layer error', () => {
    expect(codeOf(() => parseRecipe(recipeText({ layers: ['base'] }))).code).toBe('E_BAD_LAYER');
    expect(codeOf(() => parseRecipe(recipeText({ layers: [{ ops: [] }] }))).code).toBe(
      'E_BAD_LAYER',
    );
    expect(codeOf(() => parseRecipe(recipeText({ layers: [{ id: '  ', ops: [] }] }))).code).toBe(
      'E_BAD_LAYER',
    );
    expect(
      codeOf(() => parseRecipe(recipeText({ layers: [{ id: 'base', ops: 'rect' }] }))).code,
    ).toBe('E_BAD_LAYER');
  });

  it('rejects a recipe that is not a JSON object', () => {
    expect(codeOf(() => parseRecipe('42')).code).toBe('E_PARSE');
  });

  it('tells the caller when the palette declares no families at all', () => {
    const error = codeOf(() =>
      parseRecipe(
        recipeText({
          palette: {},
          layers: [{ id: 'base', ops: [['rect', 0, 0, 2, 2, 'c.0']] }],
        }),
      ),
    );
    expect(error.code).toBe('E_UNKNOWN_SLOT');
    expect(error.hint).toContain('no families');
  });

  it('rejects unknown op keys so typos never render silently', () => {
    const error = codeOf(() =>
      parseRecipe(
        recipeText({
          layers: [
            { id: 'base', ops: [{ op: 'rect', x: 0, y: 0, w: 2, h: 2, radius: 1, color: 'c.0' }] },
          ],
        }),
      ),
    );
    expect(error.code).toBe('E_BAD_PARAM');
    expect(error.message).toContain('radius');
  });

  it('rejects translucent palette colours at parse time', () => {
    const error = codeOf(() =>
      parseRecipe(recipeText({ palette: { c: { colors: ['#00000080'] } } })),
    );
    expect(error.code).toBe('E_BAD_ALPHA');
  });

  it('records an anchor outside the canvas as a warning instead of rejecting', () => {
    const result = parseRecipe(recipeText({ anchors: { tip: [99, 4] } }));
    expect(result.recipe.anchors.tip).toEqual([99, 4]);
    expect(result.warnings.map((warning) => warning.code)).toEqual(['W_ANCHOR_OUT_OF_BOUNDS']);
  });

  it('rejects an unknown recipe key', () => {
    const error = codeOf(() => parseRecipe(recipeText({ extra: true })));
    expect(error.code).toBe('E_BAD_META');
  });
});

describe('schema 1.4 frames', () => {
  const clean = [{ id: 'base', ops: [] }];
  const clip = [{ id: 'base', ops: [['rect', -2, 0, 4, 4, 'c.0']] }];

  it('gates frames to 1.4 and validates the frame shape', () => {
    for (const version of [1, '1.1', '1.2', '1.3']) {
      const error = codeOf(() =>
        parseRecipe(recipeText({ version, frames: [{ id: 'a', layers: clean }] })),
      );
      expect(error.code).toBe('E_BAD_VERSION');
      expect(`${error.message} ${error.hint}`).toContain('1.4');
    }
    expect(codeOf(() => parseRecipe(recipeText({ version: '1.4', frames: [] }))).code).toBe(
      'E_BAD_META',
    );
    expect(
      codeOf(() =>
        parseRecipe(
          recipeText({
            version: '1.4',
            frames: [
              { id: 'a', layers: clean },
              { id: 'a', layers: clean },
            ],
          }),
        ),
      ).code,
    ).toBe('E_BAD_META');
    expect(
      codeOf(() =>
        parseRecipe(
          recipeText({ version: '1.4', frames: [{ id: 'a', layers: clean, duration: 1.5 }] }),
        ),
      ).code,
    ).toBe('E_BAD_META');
    expect(
      codeOf(() => parseRecipe(recipeText({ version: '1.4', frames: [{ id: 'a' }] }))).code,
    ).toBe('E_BAD_LAYER');
  });

  it('tags additional-frame findings without changing frame 0', () => {
    const legacy = lintCompiled(
      compileRecipe(parseRecipe(recipeText({ version: '1.3', layers: clip })).recipe),
    );
    const all = lintCompiledFrames(
      compileRecipeFrames(
        parseRecipe(
          recipeText({ version: '1.4', layers: clip, frames: [{ id: 'idle', layers: clip }] }),
        ).recipe,
      ),
    );
    expect(all.filter((finding) => finding.frame === undefined)).toEqual(legacy);
    expect(
      all
        .filter((finding) => finding.frame === 1)
        .some((finding) => finding.code === 'OUT_OF_BOUNDS'),
    ).toBe(true);
    expect(lintBlocks(all, true)).toBe(true);
  });
});
