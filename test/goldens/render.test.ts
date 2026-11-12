import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import { sha256Hex } from '../../src/render/render.js';

const FIXTURES = join(process.cwd(), 'test', 'goldens', 'fixtures');

/**
 * The committed hash is the drift detector: a mismatch means the renderer
 * changed. It is never refreshed automatically — either the change was
 * intended (document it and re-baseline deliberately) or it was a defect.
 */
describe('golden hero', () => {
  const text = readFileSync(join(FIXTURES, 'hero.px.json'), 'utf8');
  const parsed = parseRecipe(text);

  it('is stored in canonical form', () => {
    expect(serializeRecipe(parsed.recipe)).toBe(text);
    expect(parsed.warnings).toEqual([]);
  });

  it('renders to the committed SHA-256 twice in a row', async () => {
    const expected = readFileSync(join(FIXTURES, 'hero.sha256'), 'utf8').trim();
    expect(expected).toMatch(/^[0-9a-f]{64}$/);
    const { renderRecipe } = await import('../../src/render/render.js');
    const first = renderRecipe(parsed.recipe);
    const second = renderRecipe(parseRecipe(text).recipe);
    expect(first.warnings).toEqual([]);
    expect(sha256Hex(first.png)).toBe(expected);
    expect(sha256Hex(second.png)).toBe(expected);
  });
});
