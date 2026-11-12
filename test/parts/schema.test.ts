/**
 * Schema 1.1: version acceptance, the `parts` map, and the `part` key on the
 * ops that paint. FR-1, FR-2, FR-5, FR-6 (AC-2, AC-5, AC-6).
 */

import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { codeOf, opOf, parseText, recipeText } from './helpers.js';

const GLOSSES = ['matte', 'metal', 'gem', 'cloth'];

describe('recipe version', () => {
  it('accepts 1.1 and keeps the literal', () => {
    expect(parseText(recipeText()).version).toBe('1.1');
  });

  it('still accepts the legacy numeric 1 and the string 1.0', () => {
    expect(parseText(recipeText({ version: 1 })).version).toBe(1);
    expect(parseText(recipeText({ version: '1.0' })).version).toBe('1.0');
  });

  it('rejects versions outside the accepted set', () => {
    for (const version of [2, '2.0', '1', true, null]) {
      const error = codeOf(() => parseText(recipeText({ version })));
      expect(error.code, `version ${JSON.stringify(version)}`).toBe('E_BAD_VERSION');
    }
  });
});

describe('parts map', () => {
  it('defaults gloss to matte and z to 0', () => {
    const recipe = parseText(
      recipeText({
        parts: { blade: { material: 'steel', gloss: 'metal' }, hilt: { material: 'leather' } },
      }),
    );
    expect(recipe.parts?.blade).toEqual({ material: 'steel', gloss: 'metal', z: 0 });
    expect(recipe.parts?.hilt).toEqual({ material: 'leather', gloss: 'matte', z: 0 });
  });

  it('accepts all four gloss profiles (AC-6)', () => {
    for (const gloss of GLOSSES) {
      const recipe = parseText(recipeText({ parts: { blade: { material: 'steel', gloss } } }));
      expect(recipe.parts?.blade.gloss).toBe(gloss);
    }
  });

  it('rejects an unknown gloss with E_GLOSS_UNKNOWN (AC-6)', () => {
    const error = codeOf(() =>
      parseText(recipeText({ parts: { blade: { material: 'steel', gloss: 'satin' } } })),
    );
    expect(error.code).toBe('E_GLOSS_UNKNOWN');
    expect(error.message).toContain('satin');
    expect(error.hint).toContain('metal');
  });

  it('requires material and rejects unknown part keys and non-integer z', () => {
    expect(codeOf(() => parseText(recipeText({ parts: { blade: { gloss: 'metal' } } }))).code).toBe(
      'E_BAD_PARAM',
    );
    expect(
      codeOf(() => parseText(recipeText({ parts: { blade: { material: 'steel', weight: 1 } } })))
        .code,
    ).toBe('E_BAD_PARAM');
    expect(
      codeOf(() => parseText(recipeText({ parts: { blade: { material: 'steel', z: 1.5 } } }))).code,
    ).toBe('E_BAD_PARAM');
  });

  it('rejects a material that is not a palette family (AC-5 precondition)', () => {
    const error = codeOf(() =>
      parseText(recipeText({ parts: { blade: { material: 'mithril' } } })),
    );
    expect(error.code).toBe('E_MATERIAL_UNKNOWN');
    expect(error.message).toContain('mithril');
    expect(error.hint).toContain('leather');
  });

  it('accepts an absent and an empty parts map', () => {
    expect(parseText(recipeText({ parts: undefined })).parts).toEqual({});
    expect(parseText(recipeText({ parts: {} })).parts).toEqual({});
  });
});

describe('part on ops', () => {
  const tagged = [
    { op: 'set_pixels', points: [[1, 1]], color: 'steel.base' },
    { op: 'line', x1: 0, y1: 0, x2: 2, y2: 2, color: 'steel.base' },
    { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'steel.base' },
    { op: 'ellipse', x: 0, y: 0, w: 4, h: 4, color: 'steel.base' },
    {
      op: 'polygon',
      points: [
        [0, 0],
        [4, 0],
        [2, 4],
      ],
      color: 'steel.base',
    },
    { op: 'flood_fill', x: 1, y: 1, color: 'steel.base' },
    { op: 'dither_fill', x: 0, y: 0, w: 4, h: 4, color: 'steel.base', pattern: 'checker_50' },
    { op: 'ascii_blit', x: 0, y: 0, grid: ['x'], legend: { x: 'steel.base' } },
  ];

  it('accepts part on every pixel-creating op (FR-2)', () => {
    for (const raw of tagged) {
      const recipe = parseText(
        recipeText({ layers: [{ id: 'base', ops: [{ ...raw, part: 'blade' }] }] }),
      );
      expect(opOf(recipe)?.part, raw.op).toBe('blade');
    }
  });

  it('rejects part on ops that inherit ownership', () => {
    for (const raw of [
      { op: 'mirror', axis: 'x', pivot: 4 },
      { op: 'auto_shade', light_dir: 'top-left' },
      { op: 'ramp_fill', bands: 2, light_dir: 'top-left' },
      { op: 'replace_slot', from: 'steel.base', to: 'steel.shadow' },
    ]) {
      expect(
        codeOf(() =>
          parseText(recipeText({ layers: [{ id: 'base', ops: [{ ...raw, part: 'blade' }] }] })),
        ).code,
        raw.op,
      ).toBe('E_BAD_PARAM');
    }
  });

  it('rejects a non-string or empty part', () => {
    for (const part of [3, '', null]) {
      expect(
        codeOf(() =>
          parseText(
            recipeText({
              layers: [
                { id: 'base', ops: [{ op: 'set_pixels', points: [[0, 0]], color: null, part }] },
              ],
            }),
          ),
        ).code,
      ).toBe('E_BAD_PARAM');
    }
  });

  it('names the declared parts when an op uses an undeclared name (AC-2)', () => {
    const error = codeOf(() =>
      parseText(
        recipeText({
          parts: { blade: { material: 'steel' }, hilt: { material: 'leather' } },
          layers: [
            {
              id: 'base',
              ops: [{ op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'steel.base', part: 'blade' }],
            },
            {
              id: 'detail',
              ops: [{ op: 'line', x1: 0, y1: 0, x2: 2, y2: 2, color: 'steel.base', part: 'gem' }],
            },
          ],
        }),
      ),
    );
    expect(error.code).toBe('E_PART_UNKNOWN');
    expect(error.message).toContain('"gem"');
    expect(error.message).toContain('detail');
    expect(error.hint).toContain('blade');
    expect(error.hint).toContain('hilt');
    expect(error.location.layer).toBe('detail');
    expect(error.location.op_index).toBe(0);
  });

  it('says so when no parts are declared at all', () => {
    const error = codeOf(() =>
      parseText(
        recipeText({
          parts: {},
          layers: [
            {
              id: 'base',
              ops: [{ op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'steel.base', part: 'blade' }],
            },
          ],
        }),
      ),
    );
    expect(error.code).toBe('E_PART_UNKNOWN');
    expect(error.hint).toContain('Declare parts first');
  });
});

describe('material resolution', () => {
  it('fails a flat material with E_NO_RAMP and the derive hint (AC-5)', () => {
    const text = recipeText({
      palette: { leather: { colors: ['#4a2f1b', '#8a5a30'] } },
      parts: { hilt: { material: 'leather' } },
      layers: [
        {
          id: 'base',
          ops: [
            { op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'leather.0', part: 'hilt' },
            { op: 'auto_shade', light_dir: 'top-left' },
          ],
        },
      ],
    });
    const error = codeOf(() => compileRecipe(parseText(text)));
    expect(error.code).toBe('E_NO_RAMP');
    expect(error.message).toContain('leather');
    expect(error.hint).toContain('--derive-ramps');
  });

  it('rejects a half-built ramp at validation, naming the missing role (AC-5)', () => {
    const text = recipeText({
      palette: {
        steel: { ramp: { outline: '#11151c', shadow: '#333a44', base: '#7d8a9a' } },
      },
      parts: { blade: { material: 'steel' } },
      layers: [
        {
          id: 'base',
          ops: [{ op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'steel.base', part: 'blade' }],
        },
      ],
    });
    const error = codeOf(() => parseText(text));
    expect(error.code).toBe('E_NO_RAMP');
    expect(error.message).toContain('steel');
    expect(error.message).toContain('highlight');
    expect(error.message).toContain('blade');
    expect(error.hint).toContain('--derive-ramps');
  });

  it('reports the first missing shading role in ramp order', () => {
    const text = recipeText({
      palette: { steel: { ramp: { base: '#7d8a9a' } } },
      parts: { blade: { material: 'steel' } },
    });
    const error = codeOf(() => parseText(text));
    expect(error.code).toBe('E_NO_RAMP');
    expect(error.message).toContain('shadow');
  });

  it('accepts a complete ramp, and leaves undeclared families alone', () => {
    const text = recipeText({
      layers: [
        {
          id: 'base',
          ops: [{ op: 'rect', x: 0, y: 0, w: 4, h: 4, color: 'steel.base', part: 'blade' }],
        },
      ],
    });
    const compiled = compileRecipe(parseText(text));
    expect(compiled.parts[0]?.painted).toBe(16);
    // `leather` is flat, but nothing declares it as a material, so it is legal.
    const noParts = recipeText({ parts: {}, layers: [{ id: 'base', ops: [] }] });
    expect(parseText(noParts).parts).toEqual({});
  });
});
