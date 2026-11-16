/**
 * NFR-6/AC-2: every committed legacy recipe (no design block) must still parse
 * canonically and render to the exact digest it had before design existed.
 * Two distinct fixture sets are checked so their prefixes cannot be mixed.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import { renderRecipe, sha256Hex } from '../../src/render/render.js';

const ROOT = process.cwd();

interface Fixture {
  set: 'golden' | 'benchmarks-1.0' | 'art-1.1';
  name: string;
  recipe: string;
  digest: string;
}

function fixtures(set: Fixture['set'], directory: string, names: readonly string[]): Fixture[] {
  return names.map((name) => ({
    set,
    name,
    recipe: join(ROOT, 'test', directory, name, `${name}.px.json`),
    digest: join(ROOT, 'test', directory, name, `${name}.sha256`),
  }));
}

const ALL: Fixture[] = [
  {
    set: 'golden',
    name: 'hero',
    recipe: join(ROOT, 'test', 'goldens', 'fixtures', 'hero.px.json'),
    digest: join(ROOT, 'test', 'goldens', 'fixtures', 'hero.sha256'),
  },
  ...fixtures('benchmarks-1.0', 'benchmarks', ['potion', 'sword', 'humanoid', 'chest']),
  ...fixtures('art-1.1', 'art', [
    'potion',
    'sword',
    'humanoid',
    'chest',
    'character',
    'prop',
    'scene',
  ]),
];

describe('legacy recipe compatibility', () => {
  it('covers the hero plus both distinct fixture sets', () => {
    expect(ALL).toHaveLength(12);
    expect(ALL.filter((fixture) => fixture.set === 'benchmarks-1.0')).toHaveLength(4);
    expect(ALL.filter((fixture) => fixture.set === 'art-1.1')).toHaveLength(7);
  });

  it.each(ALL)('$set/$name keeps its bytes and committed render digest', (fixture) => {
    const text = readFileSync(fixture.recipe, 'utf8');
    // The recipe directory is passed explicitly: resolution never uses ambient cwd.
    const parsed = parseRecipe(text, { baseDir: dirname(fixture.recipe) });
    expect(parsed.recipe.design).toBeUndefined();
    // The art set is author-written 1.3 with `derive` palettes: those expand to
    // explicit ramps on read, so its recipe bytes were never canonical. The
    // invariant that matters here is the *render* digest, which must not move.
    if (fixture.set !== 'art-1.1') {
      expect(serializeRecipe(parsed.recipe)).toBe(text);
    }

    const committed = readFileSync(fixture.digest, 'utf8').trim();
    expect(committed).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Hex(renderRecipe(parsed.recipe).png)).toBe(committed);
  });
});
