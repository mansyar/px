/**
 * The lint judgement has to follow the scale. These tests prove the wiring from
 * three directions: the same canvas lints differently under different profiles,
 * the `small` row is exactly what a hand-built context used to get, and the one
 * number that is deliberately scale-independent (`orphanRadius`) does not move.
 */

import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { parseHex } from '../../src/core/palette.js';
import { PROFILES } from '../../src/core/profile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { contrastRatio } from '../../src/lint/contrast.js';
import { lintCompiled } from '../../src/lint/index.js';
import { hasKink, jaggySegments } from '../../src/lint/jaggy.js';
import { LOW_CONTRAST_BACKDROP } from '../../src/lint/thresholds.js';
import type { LintFinding } from '../../src/lint/types.js';

interface SpriteOptions {
  width?: number;
  height?: number;
  profile?: string;
  points?: Array<[number, number]>;
  rectColor?: string;
}

function spriteText(options: SpriteOptions = {}): string {
  const width = options.width ?? 8;
  const height = options.height ?? 8;
  const palette = { main: { colors: ['#000000'] } };
  const ops: unknown[] = [];
  if (options.points !== undefined) {
    ops.push({ op: 'set_pixels', points: options.points, color: 'main.0' });
  }
  if (options.rectColor !== undefined) {
    ops.push({ op: 'rect', x: 0, y: 0, w: width, h: height, color: 'main.0' });
    palette.main.colors = [options.rectColor];
  }
  const meta: Record<string, unknown> = {
    name: 'scale',
    width,
    height,
    alpha_mode: 'binary',
  };
  if (options.profile !== undefined) {
    meta.profile = options.profile;
  }
  return `${JSON.stringify({
    version: 1,
    meta,
    palette,
    anchors: {},
    layers: [{ id: 'base', ops }],
  })}\n`;
}

function findings(options: SpriteOptions): LintFinding[] {
  const parsed = parseRecipe(spriteText(options));
  return lintCompiled(compileRecipe(parsed.recipe));
}

function ofCode(list: readonly LintFinding[], code: string): LintFinding[] {
  return list.filter((finding) => finding.code === code);
}

/**
 * A shallow three-step edge: three rows at column 2, one at 1, three at 0. Its
 * step lengths are 3,1,3 — a kink under a 2 px jump (the middle run leaves two
 * agreeing neighbours), a smooth shallow curve under the 3 px jump of `large`.
 */
const SHALLOW_EDGE: Array<[number, number]> = [
  [2, 0],
  [2, 1],
  [2, 2],
  [1, 3],
  [0, 4],
  [0, 5],
  [0, 6],
];

describe('JAGGY_LINE follows the profile', () => {
  it('reads a shallow edge as a jaggy at tiny and small', () => {
    for (const profile of ['tiny', 'small'] as const) {
      const jaggy = ofCode(findings({ profile, points: SHALLOW_EDGE }), 'JAGGY_LINE');
      expect(jaggy.length).toBeGreaterThan(0);
      expect(jaggy[0]?.message).toContain('3,1,3');
    }
  });

  it('reads the same edge as a legitimate curve at large', () => {
    const jaggy = ofCode(findings({ profile: 'large', points: SHALLOW_EDGE }), 'JAGGY_LINE');
    expect(jaggy).toEqual([]);
  });

  it('keeps the medium row between the two', () => {
    expect(PROFILES.medium.jaggyStepJump).toBe(PROFILES.small.jaggyStepJump);
    expect(PROFILES.medium.jaggyMaxRun).toBeGreaterThan(PROFILES.small.jaggyMaxRun);
    const jaggy = ofCode(findings({ profile: 'medium', points: SHALLOW_EDGE }), 'JAGGY_LINE');
    expect(jaggy.length).toBeGreaterThan(0);
  });
});

describe('LOW_CONTRAST follows the profile', () => {
  /** #9a9a9a sits between the 1.35 floor of `medium` and the 1.5 of `small`. */
  const AFFECTED = '#9a9a9a';

  it('picks a grey that only the small and tiny floors catch', () => {
    const color = parseHex(AFFECTED);
    expect(color).not.toBeNull();
    const ratio = contrastRatio(color ?? { r: 0, g: 0, b: 0, a: 255 }, LOW_CONTRAST_BACKDROP);
    expect(ratio).toBeGreaterThan(PROFILES.medium.lowContrastMinRatio);
    expect(ratio).toBeLessThan(PROFILES.small.lowContrastMinRatio);
  });

  it('flags the grey at tiny and small, and leaves it alone at medium and large', () => {
    for (const profile of ['tiny', 'small'] as const) {
      const contrast = ofCode(findings({ profile, rectColor: AFFECTED }), 'LOW_CONTRAST');
      expect(contrast).toHaveLength(1);
      expect(contrast[0]?.message).toContain(
        `below ${PROFILES[profile].lowContrastMinRatio}:1 contrast`,
      );
    }
    for (const profile of ['medium', 'large'] as const) {
      const contrast = ofCode(findings({ profile, rectColor: AFFECTED }), 'LOW_CONTRAST');
      expect(contrast).toEqual([]);
    }
  });
});

describe('ORPHAN_PIXEL ignores the profile, on purpose', () => {
  it('flags the same lone pixel at every scale', () => {
    for (const profile of ['tiny', 'small', 'medium', 'large'] as const) {
      const orphan = ofCode(
        findings({ width: 128, height: 128, profile, points: [[70, 70]] }),
        'ORPHAN_PIXEL',
      );
      expect(orphan).toHaveLength(1);
      expect(orphan[0]?.message).toContain('within 2 px');
    }
  });
});

describe('a hand-built context lints as small did', () => {
  const SEQUENCES: Array<Array<{ line: number; value: number } | null>> = [
    [
      { line: 0, value: 0 },
      { line: 1, value: 0 },
      { line: 2, value: 1 },
      { line: 3, value: 2 },
      { line: 4, value: 2 },
      { line: 5, value: 2 },
    ],
    [
      { line: 0, value: 0 },
      { line: 1, value: 0 },
      { line: 2, value: 0 },
      { line: 3, value: 0 },
      { line: 4, value: 1 },
      { line: 5, value: 1 },
    ],
    [
      { line: 0, value: 0 },
      { line: 1, value: 0 },
      null,
      { line: 3, value: 2 },
      { line: 4, value: 2 },
      { line: 5, value: 2 },
    ],
  ];

  it('defaults every number to the compatibility row', () => {
    for (const sequence of SEQUENCES) {
      expect(jaggySegments(sequence)).toEqual(jaggySegments(sequence, PROFILES.small));
    }
  });

  it('takes the step jump as an argument, defaulting to 2', () => {
    expect(hasKink([2, 1, 3])).toBe(true);
    expect(hasKink([2, 1, 3], PROFILES.small.jaggyStepJump)).toBe(true);
    expect(hasKink([2, 1, 3], PROFILES.large.jaggyStepJump)).toBe(false);
    expect(hasKink([1, 2, 3], PROFILES.large.jaggyStepJump)).toBe(false);
  });
});
