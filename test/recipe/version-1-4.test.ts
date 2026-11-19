// NOTE: this dedicated file is intentionally outside every Vitest project
// include, so CI does not execute it. The mirrored assertions in
// test/unit/recipe.test.ts and test/unit/compile.test.ts are the coverage that
// actually runs. Keep those in-scope mirrors in sync when editing anything here.
/**
 * AC-1, AC-2, AC-4: version 1.4 adds an optional, version-gated `frames` array.
 * Frame 0 is the top-level `layers`; only additional frames live in `frames`, so
 * every existing recipe keeps its bytes and a framed recipe lints frame by frame.
 */

import { describe, expect, it } from 'vitest';
import { compileRecipe, compileRecipeFrames } from '../../src/core/compile.js';
import { PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import {
  compareFindings,
  lintBlocks,
  lintCompiled,
  lintCompiledFrames,
} from '../../src/lint/index.js';

const CLEAN_LAYERS = [{ id: 'base', ops: [['rect', 0, 0, 4, 4, 'c.0']] }];
const CLIP_LAYERS = [{ id: 'base', ops: [['rect', -2, 0, 4, 4, 'c.0']] }];

function document(
  version: unknown,
  frames?: unknown,
  layers: unknown = CLEAN_LAYERS,
): Record<string, unknown> {
  const raw: Record<string, unknown> = {
    version,
    meta: { name: 'anim', width: 8, height: 8, alpha_mode: 'binary' },
    palette: { c: { colors: ['#000000', '#ffffff'] } },
    anchors: {},
    layers,
  };
  if (frames !== undefined) {
    raw.frames = frames;
  }
  return raw;
}

function text(version: unknown, frames?: unknown, layers?: unknown): string {
  return JSON.stringify(document(version, frames, layers));
}

function frame(
  id: string,
  layers: unknown = CLEAN_LAYERS,
  duration?: number,
): Record<string, unknown> {
  return { id, layers, ...(duration === undefined ? {} : { duration }) };
}

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof PxError) {
      return error.code;
    }
    return 'not-a-px-error';
  }
  return 'no-error';
}

function messageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof PxError) {
      return `${error.message} ${error.hint}`;
    }
  }
  return '';
}

describe('schema 1.4 version gate', () => {
  it('accepts 1.4 with and without frames', () => {
    expect(parseRecipe(text('1.4')).recipe.version).toBe('1.4');
    expect(parseRecipe(text('1.4')).recipe.frames).toBeUndefined();
    const result = parseRecipe(text('1.4', [frame('idle'), frame('walk', CLEAN_LAYERS, 120)]));
    expect(result.recipe.frames?.map((entry) => entry.id)).toEqual(['idle', 'walk']);
    expect(result.recipe.frames?.[1]?.duration).toBe(120);
    expect(result.recipe.frames?.[0]?.duration).toBeUndefined();
  });

  it('rejects frames below 1.4 with an error that names 1.4', () => {
    for (const version of [1, '1.0', '1.1', '1.2', '1.3']) {
      const run = () => parseRecipe(text(version, [frame('idle')]));
      expect(codeOf(run)).toBe('E_BAD_VERSION');
      expect(messageOf(run)).toContain('1.4');
    }
  });
});

describe('schema 1.4 frame shape', () => {
  it('rejects an empty or non-array frames field', () => {
    expect(codeOf(() => parseRecipe(text('1.4', [])))).toBe('E_BAD_META');
    expect(codeOf(() => parseRecipe(text('1.4', 'idle')))).toBe('E_BAD_META');
  });

  it('rejects an empty, missing or duplicate frame id', () => {
    for (const frames of [
      [frame('  ')],
      [{ layers: CLEAN_LAYERS }],
      [frame('idle'), frame('idle')],
    ]) {
      expect(codeOf(() => parseRecipe(text('1.4', frames)))).toBe('E_BAD_META');
    }
  });

  it('rejects a missing layers array, a non-integer duration and unknown frame keys', () => {
    expect(codeOf(() => parseRecipe(text('1.4', [{ id: 'idle' }])))).toBe('E_BAD_LAYER');
    expect(codeOf(() => parseRecipe(text('1.4', [frame('idle', CLEAN_LAYERS, 1.5)])))).toBe(
      'E_BAD_META',
    );
    expect(codeOf(() => parseRecipe(text('1.4', [{ ...frame('idle'), duration: 'slow' }])))).toBe(
      'E_BAD_META',
    );
    expect(codeOf(() => parseRecipe(text('1.4', [{ ...frame('idle'), unknown: true }])))).toBe(
      'E_BAD_META',
    );
  });

  it('lets each frame reuse layer ids and records duration without interpreting it', () => {
    const first = parseRecipe(text('1.4', [frame('a', CLEAN_LAYERS, 80)]));
    const second = parseRecipe(text('1.4', [frame('a', CLEAN_LAYERS, 800)]));
    expect(first.recipe.frames?.[0]?.layers.map((layer) => layer.id)).toEqual(['base']);
    expect(first.recipe.frames?.[0]?.duration).toBe(80);
    expect(second.recipe.frames?.[0]?.duration).toBe(800);
    expect(compileRecipeFrames(first.recipe)[1]?.compiled.flattened).toEqual(
      compileRecipeFrames(second.recipe)[1]?.compiled.flattened,
    );
  });
});

describe('schema 1.4 canonical serialization', () => {
  it('round-trips a framed recipe byte-for-byte with frames after layers', () => {
    const once = serializeRecipe(
      parseRecipe(text('1.4', [frame('idle'), frame('walk', CLEAN_LAYERS, 120)])).recipe,
    );
    expect(once.indexOf('"layers"')).toBeLessThan(once.indexOf('"frames"'));
    expect(once).toContain('"duration": 120');
    expect(serializeRecipe(parseRecipe(once).recipe)).toBe(once);
  });

  it('differs from v1.3 only in the version literal when frames are absent', () => {
    const v13 = serializeRecipe(parseRecipe(text('1.3')).recipe);
    const v14 = serializeRecipe(parseRecipe(text('1.4')).recipe);
    expect(v14).toBe(v13.replace('"version": "1.3"', '"version": "1.4"'));
    expect(v14).not.toContain('"frames"');
  });
});

describe('schema 1.4 per-frame lint', () => {
  it('leaves frame-0 findings byte-identical and tags additional frames', () => {
    const legacy = lintCompiled(
      compileRecipe(parseRecipe(text('1.3', undefined, CLIP_LAYERS)).recipe),
    );
    const all = lintCompiledFrames(
      compileRecipeFrames(parseRecipe(text('1.4', [frame('idle', CLIP_LAYERS)])).recipe),
    );
    const frameZero = all.filter((finding) => finding.frame === undefined);
    const extra = all.filter((finding) => finding.frame === 1);
    expect(frameZero).toEqual(legacy);
    expect(extra.length).toBeGreaterThan(0);
    expect(extra.some((finding) => finding.code === 'OUT_OF_BOUNDS')).toBe(true);
    for (const finding of all) {
      if (finding.frame !== undefined) {
        expect(finding.frame).toBe(1);
      }
    }
  });

  it('orders findings by frame index before severity and code', () => {
    const later = {
      code: 'OUT_OF_BOUNDS',
      severity: 'warning',
      message: 'later',
      frame: 2,
    } as const;
    const earlier = {
      code: 'ORPHAN_PIXEL',
      severity: 'error',
      message: 'earlier',
      frame: 1,
    } as const;
    expect(compareFindings(earlier, later)).toBeLessThan(0);
    expect(compareFindings(later, earlier)).toBeGreaterThan(0);
    expect(
      compareFindings(
        { ...earlier, frame: undefined, coord: [2, 0] },
        { ...earlier, frame: undefined, coord: [1, 0] },
      ),
    ).toBeGreaterThan(0);
  });

  it('gates strict mode on a warning from any frame', () => {
    const findings = lintCompiledFrames(
      compileRecipeFrames(
        parseRecipe(text('1.4', [frame('idle', CLIP_LAYERS), frame('walk', CLIP_LAYERS)])).recipe,
      ),
    );
    expect(findings.some((finding) => finding.frame === 2)).toBe(true);
    expect(lintBlocks(findings, false)).toBe(false);
    expect(lintBlocks(findings, true)).toBe(true);
  });
});
