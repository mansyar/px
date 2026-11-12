/**
 * Canonical writing of parts (FR-1): key order, the version upgrade, and the
 * promise that a 1.0 recipe with no parts survives a read-write cycle byte for
 * byte — the same contract the goldens suite holds the hero fixture to.
 */

import { describe, expect, it } from 'vitest';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { canonicalOp, serializeRecipe } from '../../src/core/recipe/serialize.js';
import type { Part, Parts, Recipe } from '../../src/core/recipe/types.js';
import { parseText, recipeText } from './helpers.js';

/** A 1.0 recipe exactly as the writer would emit it: no parts, numeric version. */
function oneZeroText(): string {
  return `${JSON.stringify(
    {
      version: 1,
      meta: { name: 'legacy', width: 8, height: 8, alpha_mode: 'binary' },
      palette: {
        leather: { colors: ['#4a2f1b', '#8a5a30'] },
        steel: {
          ramp: {
            outline: '#11151c',
            shadow: '#333a44',
            base: '#7d8a9a',
            highlight: '#c8d4e0',
          },
        },
      },
      anchors: { pivot: [4, 4] },
      layers: [
        {
          id: 'base',
          ops: [
            { op: 'rect', x: 1, y: 1, w: 2, h: 2, color: 'steel.base' },
            { op: 'line', x1: 0, y1: 0, x2: 7, y2: 7, color: 'leather.0' },
          ],
        },
      ],
    },
    null,
    2,
  )}\n`;
}

function withParts(recipe: Recipe, parts: Parts): Recipe {
  return { ...recipe, parts };
}

const BLADE: Part = { material: 'steel', gloss: 'matte', z: 0 };
const HILT: Part = { material: 'leather', gloss: 'cloth', z: 2 };
const TWO_PARTS: Parts = { blade: BLADE, hilt: HILT };

describe('1.0 compatibility', () => {
  it('writes a part-less 1.0 recipe back byte for byte', () => {
    const text = oneZeroText();
    const { recipe, warnings } = parseRecipe(text);

    expect(warnings).toEqual([]);
    expect(recipe.version).toBe(1);
    expect(recipe.parts).toEqual({});
    expect(serializeRecipe(recipe)).toBe(text);
  });

  it('keeps the numeric version literal and never writes an empty parts map', () => {
    const text = serializeRecipe(withParts(parseText(oneZeroText()), {}));

    expect(text).toBe(oneZeroText());
    expect(text.startsWith('{\n  "version": 1,\n')).toBe(true);
    expect(text).not.toContain('"parts"');
  });

  it('upgrades to 1.1 only once the recipe actually declares a part', () => {
    const legacy = parseText(oneZeroText());
    const text = serializeRecipe(withParts(legacy, { blade: BLADE }));

    expect(text.startsWith('{\n  "version": "1.1",\n')).toBe(true);
    expect(text).toContain('"parts"');
    expect(legacy.version).toBe(1);
  });

  it('leaves an explicit 1.1 version alone on a part-less recipe', () => {
    const text = serializeRecipe(parseText(recipeText({ parts: undefined })));

    expect(text.startsWith('{\n  "version": "1.1",\n')).toBe(true);
  });
});

describe('canonical parts', () => {
  it('orders the top level version, meta, palette, parts, anchors, layers', () => {
    const text = serializeRecipe(withParts(parseText(recipeText()), TWO_PARTS));
    const order = ['"version"', '"meta"', '"palette"', '"parts"', '"anchors"', '"layers"'];
    const indexes = order.map((key) => text.indexOf(key));

    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect([...indexes].sort((a, b) => a - b)).toEqual(indexes);
  });

  it('sorts part names and writes material, gloss, then a non-zero z', () => {
    const text = serializeRecipe(withParts(parseText(recipeText()), TWO_PARTS));

    expect(text.indexOf('"blade"')).toBeLessThan(text.indexOf('"hilt"'));
    expect(text).toContain(
      '"blade": {\n      "material": "steel",\n      "gloss": "matte"\n    },',
    );
    expect(text).toContain(
      '"hilt": {\n      "material": "leather",\n      "gloss": "cloth",\n      "z": 2\n    }',
    );
  });

  it('round-trips a 1.1 recipe with parts and op tags without drift', () => {
    const source = recipeText({
      parts: {
        hilt: { material: 'leather', gloss: 'cloth', z: 2 },
        blade: { material: 'steel' },
      },
      layers: [
        {
          id: 'base',
          ops: [
            {
              op: 'set_pixels',
              id: 'tag',
              part: 'blade',
              points: [
                [1, 1],
                [2, 2],
              ],
              color: 'steel.base',
            },
          ],
        },
      ],
    });
    const text = serializeRecipe(parseText(source));

    expect(serializeRecipe(parseText(text))).toBe(text);
    expect(text.indexOf('"blade"')).toBeLessThan(text.indexOf('"hilt"'));
  });

  it('writes part immediately after op, before id and params', () => {
    const canonical = canonicalOp({
      op: 'rect',
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      color: 'steel.base',
      part: 'blade',
      id: 'tag',
    });

    expect(Object.keys(canonical).slice(0, 3)).toEqual(['op', 'part', 'id']);
  });
});
