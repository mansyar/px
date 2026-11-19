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

/**
 * The framed fixture pins two things at once: frame 0 must still be the legacy
 * single-frame render, and the packed sheet must be a pure function of the same
 * recipe. Both digests are committed drift detectors, never refreshed silently.
 */
describe('golden anim-duo', () => {
  const text = readFileSync(join(FIXTURES, 'anim-duo.px.json'), 'utf8');
  const parsed = parseRecipe(text);

  it('is stored in canonical form', () => {
    expect(serializeRecipe(parsed.recipe)).toBe(text);
    expect(parsed.warnings).toEqual([]);
  });

  it('renders frame 0 and the sheet to the committed SHA-256 twice', async () => {
    const expectedFrame = readFileSync(join(FIXTURES, 'anim-duo.sha256'), 'utf8').trim();
    const expectedSheet = readFileSync(join(FIXTURES, 'anim-duo.sheet.sha256'), 'utf8').trim();
    expect(expectedFrame).toMatch(/^[0-9a-f]{64}$/);
    expect(expectedSheet).toMatch(/^[0-9a-f]{64}$/);

    const { renderRecipe } = await import('../../src/render/render.js');
    const { renderSheet } = await import('../../src/cli/commands.js');
    const first = renderRecipe(parsed.recipe);
    const firstSheet = renderSheet(parsed.recipe);
    const second = renderRecipe(parseRecipe(text).recipe);
    const secondSheet = renderSheet(parseRecipe(text).recipe);

    expect(first.warnings).toEqual([]);
    expect([first.width, first.height]).toEqual([16, 16]);
    expect([firstSheet.width, firstSheet.height]).toEqual([32, 16]);
    expect(sha256Hex(first.png)).toBe(expectedFrame);
    expect(sha256Hex(second.png)).toBe(expectedFrame);
    expect(sha256Hex(firstSheet.png)).toBe(expectedSheet);
    expect(sha256Hex(secondSheet.png)).toBe(expectedSheet);
  });

  it('describes both frames in pack order', async () => {
    const { renderSheet } = await import('../../src/cli/commands.js');
    const sheet = renderSheet(parsed.recipe);
    expect(
      sheet.frames.map((frame) => ({
        index: frame.index,
        id: frame.id,
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
        trim: frame.trim,
        origin: frame.origin,
        duration: frame.duration,
      })),
    ).toEqual([
      {
        index: 0,
        id: undefined,
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        trim: { x: 2, y: 4, w: 8, h: 8 },
        origin: { x: -2, y: -4 },
        duration: undefined,
      },
      {
        index: 1,
        id: 'shift',
        x: 16,
        y: 0,
        width: 16,
        height: 16,
        trim: { x: 6, y: 4, w: 8, h: 8 },
        origin: { x: -6, y: -4 },
        duration: 120,
      },
    ]);
  });
});
