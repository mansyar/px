import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import {
  addFrame,
  editFrame,
  listFrames,
  moveFrame,
  removeFrame,
  setFrameDuration,
} from '../../src/core/recipe/frames.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import type { Recipe } from '../../src/core/recipe/types.js';

interface RawLayer {
  id: string;
  ops: unknown[];
}

const RECT_A = ['rect', 1, 1, 2, 2, 'c.0'];
const RECT_B = ['rect', 3, 3, 2, 2, 'c.1'];

function recipeText(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: '1.4',
    meta: { name: 'anim', width: 8, height: 8, alpha_mode: 'binary' },
    palette: { c: { colors: ['#000000', '#ffffff'] } },
    anchors: {},
    layers: [{ id: 'base', ops: [RECT_A, RECT_B] }],
    ...overrides,
  });
}

function baseRecipe(overrides: Record<string, unknown> = {}): Recipe {
  return parseRecipe(recipeText(overrides)).recipe;
}

function framedRecipe(): Recipe {
  return addFrame(baseRecipe(), { id: 'walk', from: 0, duration: 120 });
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

function validAfter(recipe: Recipe): string {
  const text = serializeRecipe(recipe);
  expect(() => parseRecipe(text)).not.toThrow();
  return text;
}

describe('addFrame', () => {
  it('deep-clones frame 0 with --from 0 and keeps the clone independent', () => {
    const source = baseRecipe();
    const result = addFrame(source, { id: 'clone', from: 0 });
    expect(result.frames).toHaveLength(1);
    expect(result.frames?.[0]?.layers).toEqual(source.layers);
    expect(result.frames?.[0]?.layers).not.toBe(source.layers);
    expect(result.layers).toEqual(source.layers);
    validAfter(result);
  });

  it('deep-clones a declared frame by id', () => {
    const one = framedRecipe();
    const two = addFrame(one, { id: 'echo', from: 'walk' });
    expect(two.frames?.[1]?.layers).toEqual(one.frames?.[0]?.layers);
    expect(two.frames?.[1]?.layers).not.toBe(one.frames?.[0]?.layers);
    validAfter(two);
  });

  it('normalizes explicit layers into exactly the supplied ops', () => {
    const layers: RawLayer[] = [
      { id: 'base', ops: [['rect', 2, 2, 3, 3, 'c.1']] },
      { id: 'overlay', ops: [] },
    ];
    const result = addFrame(baseRecipe(), { id: 'explicit', layers });
    const frame = result.frames?.[0];
    expect(frame?.layers).toHaveLength(2);
    expect(frame?.layers[0]?.ops).toEqual([{ op: 'rect', x: 2, y: 2, w: 3, h: 3, color: 'c.1' }]);
    expect(frame?.layers[1]?.ops).toEqual([]);
    validAfter(result);
  });

  it('generates a deterministic id and omits duration when neither is supplied', () => {
    const first = addFrame(baseRecipe(), { from: 0 });
    expect(first.frames?.[0]?.id).toBe('frame-1');
    expect(first.frames?.[0]?.duration).toBeUndefined();
    expect(validAfter(first)).not.toContain('"duration"');
    const second = addFrame(first, { from: 0 });
    expect(second.frames?.[1]?.id).toBe('frame-2');
  });

  it('promotes the recipe version to 1.4', () => {
    const legacy = baseRecipe({ version: 1, frames: undefined });
    const result = addFrame(legacy, { id: 'walk', from: 0 });
    expect(result.version).toBe('1.4');
    validAfter(result);
  });

  it('does not mutate the input recipe', () => {
    const source = baseRecipe();
    addFrame(source, { id: 'walk', from: 0, duration: 120 });
    expect(source.frames).toBeUndefined();
    expect(source.version).toBe('1.4');
  });
});

describe('editFrame', () => {
  it('changes only the addressed op index', () => {
    const source = framedRecipe();
    const before = source.frames?.[0]?.layers[0]?.ops ?? [];
    expect(before).toHaveLength(2);
    const result = editFrame(source, { frame: 'walk', opIndex: 1, ops: [RECT_A] });
    const after = result.frames?.[0]?.layers[0]?.ops ?? [];
    expect(after).toHaveLength(2);
    expect(after[0]).toEqual(before[0]);
    expect(after[1]).toEqual({ op: 'rect', x: 1, y: 1, w: 2, h: 2, color: 'c.0' });
    validAfter(result);
  });

  it('changes only op 3 of a four-op frame', () => {
    const source = baseRecipe({
      layers: [{ id: 'base', ops: [RECT_A, RECT_B, RECT_A, RECT_B] }],
    });
    const withFrame = addFrame(source, { id: 'walk', from: 0 });
    const before = withFrame.frames?.[0]?.layers[0]?.ops ?? [];
    const result = editFrame(withFrame, { frame: 'walk', opIndex: 3, ops: [RECT_A] });
    const after = result.frames?.[0]?.layers[0]?.ops ?? [];
    expect(after).toEqual([
      before[0],
      before[1],
      before[2],
      { op: 'rect', x: 1, y: 1, w: 2, h: 2, color: 'c.0' },
    ]);
    expect(before[3]).not.toEqual(after[3]);
  });

  it('replaces the whole ops list with --replace', () => {
    const result = editFrame(framedRecipe(), {
      frame: 'walk',
      replace: true,
      ops: [RECT_A, RECT_A, RECT_B],
    });
    expect(result.frames?.[0]?.layers[0]?.ops).toHaveLength(3);
    validAfter(result);
  });

  it('addresses a frame by logical index', () => {
    const source = framedRecipe();
    const result = editFrame(source, { frame: 1, opIndex: 0, ops: [RECT_B] });
    expect(result.frames?.[0]?.layers[0]?.ops[0]).toEqual({
      op: 'rect',
      x: 3,
      y: 3,
      w: 2,
      h: 2,
      color: 'c.1',
    });
  });

  it('rejects frame 0 and out-of-range op indices', () => {
    const source = framedRecipe();
    expect(
      codeOf(() => editFrame(source, { frame: 0, opIndex: 0, ops: [RECT_A] })).message,
    ).toContain('Frame 0');
    expect(codeOf(() => editFrame(source, { frame: 'walk', opIndex: 9, ops: [RECT_A] })).code).toBe(
      'E_BAD_PARAM',
    );
  });
});

describe('removeFrame', () => {
  it('removes by id and by logical index', () => {
    const two = addFrame(framedRecipe(), { id: 'run', from: 0 });
    const byId = removeFrame(two, 'walk');
    expect(byId.frames?.map((frame) => frame.id)).toEqual(['run']);
    const byIndex = removeFrame(two, 2);
    expect(byIndex.frames?.map((frame) => frame.id)).toEqual(['walk']);
    validAfter(byId);
  });

  it('drops the frames key when the last frame is removed', () => {
    const result = removeFrame(framedRecipe(), 'walk');
    expect(result.frames).toBeUndefined();
    expect(validAfter(result)).not.toContain('"frames"');
  });

  it('refuses to remove frame 0', () => {
    expect(codeOf(() => removeFrame(framedRecipe(), 0)).message).toContain('Frame 0');
  });
});

describe('listFrames', () => {
  it('reports one row per frame including the base, with id/duration/counts', () => {
    const rows = listFrames(framedRecipe());
    expect(rows).toEqual([
      { index: 0, id: null, layers: 1, ops: 2 },
      { index: 1, id: 'walk', duration: 120, layers: 1, ops: 2 },
    ]);
  });

  it('reports only the base row for an unframed recipe', () => {
    expect(listFrames(baseRecipe())).toEqual([{ index: 0, id: null, layers: 1, ops: 2 }]);
  });
});

describe('setFrameDuration', () => {
  it('sets a positive integer duration and clears it with undefined', () => {
    const source = addFrame(baseRecipe(), { id: 'walk', from: 0 });
    const set = setFrameDuration(source, 'walk', 120);
    expect(set.frames?.[0]?.duration).toBe(120);
    expect(validAfter(set)).toContain('"duration": 120');
    const cleared = setFrameDuration(set, 'walk', undefined);
    expect(cleared.frames?.[0]?.duration).toBeUndefined();
    expect(validAfter(cleared)).not.toContain('"duration"');
  });

  it.each([0, 1.5])('rejects the bad duration %s', (duration) => {
    expect(codeOf(() => setFrameDuration(framedRecipe(), 'walk', duration)).code).toBe(
      'E_BAD_META',
    );
  });

  it('refuses to retime frame 0', () => {
    expect(codeOf(() => setFrameDuration(framedRecipe(), 0, 120)).message).toContain('Frame 0');
  });
});

describe('moveFrame', () => {
  it('reorders declared frames with a zero-based destination', () => {
    const three = addFrame(addFrame(baseRecipe(), { id: 'a', from: 0 }), { id: 'b', from: 0 });
    const ids = (recipe: Recipe): string[] => recipe.frames?.map((frame) => frame.id) ?? [];
    expect(ids(three)).toEqual(['a', 'b']);
    expect(ids(moveFrame(three, 'b', 0))).toEqual(['b', 'a']);
    expect(ids(moveFrame(three, 2, 1))).toEqual(['a', 'b']);
  });

  it('rejects an out-of-range destination and frame 0', () => {
    expect(codeOf(() => moveFrame(framedRecipe(), 'walk', 1)).code).toBe('E_BAD_PARAM');
    expect(codeOf(() => moveFrame(framedRecipe(), 0, 0)).message).toContain('Frame 0');
  });
});

describe('guardrails', () => {
  it('rejects a duplicate frame id', () => {
    expect(codeOf(() => addFrame(framedRecipe(), { id: 'walk', from: 0 })).code).toBe('E_BAD_META');
  });

  it('rejects a bad duration supplied to addFrame', () => {
    expect(codeOf(() => addFrame(baseRecipe(), { id: 'walk', from: 0, duration: 0 })).code).toBe(
      'E_BAD_META',
    );
  });

  it('rejects an unknown clone, remove and edit target', () => {
    const source = framedRecipe();
    expect(codeOf(() => addFrame(source, { id: 'x', from: 'missing' })).code).toBe('E_BAD_PARAM');
    expect(codeOf(() => removeFrame(source, 'missing')).code).toBe('E_BAD_PARAM');
    expect(
      codeOf(() => editFrame(source, { frame: 'missing', opIndex: 0, ops: [RECT_A] })).code,
    ).toBe('E_BAD_PARAM');
  });

  it('rejects malformed ops before producing a recipe', () => {
    expect(
      codeOf(() => addFrame(baseRecipe(), { id: 'x', layers: [{ id: 'base', ops: [42] }] })).code,
    ).toBe('E_UNKNOWN_OP');
    expect(
      codeOf(() => editFrame(framedRecipe(), { frame: 'walk', opIndex: 0, ops: [{ op: 'nope' }] }))
        .code,
    ).toBe('E_UNKNOWN_OP');
  });

  it('produces identical bytes for repeated identical sequences', () => {
    const sequence = (): string => {
      let recipe = baseRecipe();
      recipe = addFrame(recipe, { id: 'walk', from: 0, duration: 120 });
      recipe = addFrame(recipe, { id: 'jump', from: 'walk' });
      recipe = setFrameDuration(recipe, 'jump', 80);
      recipe = moveFrame(recipe, 'jump', 0);
      recipe = editFrame(recipe, { frame: 'jump', opIndex: 0, ops: [RECT_B] });
      return serializeRecipe(recipe);
    };
    const first = sequence();
    expect(sequence()).toBe(first);
    expect(() => parseRecipe(first)).not.toThrow();
    expect(listFrames(parseRecipe(first).recipe)).toHaveLength(3);
  });
});
