import { describe, expect, it } from 'vitest';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import { lintCompiled } from '../../src/lint/index.js';
import type { LintCode } from '../../src/lint/types.js';
import { clusterSizes, compileScene, pixelsOf, sceneRecipe, wall } from './support.js';

const PATTERNS = ['stipple', 'hatch', 'grain', 'brick', 'mottle'] as const;
const SIZES = [
  { profile: 'tiny', width: 16, minCluster: 1 },
  { profile: 'small', width: 32, minCluster: 2 },
  { profile: 'medium', width: 64, minCluster: 2 },
  { profile: 'large', width: 128, minCluster: 3 },
] as const;

function texture(pattern: string, extra: object = {}): unknown {
  return { op: 'texture', pattern, color: 'cloth.shadow', part: 'wall', ...extra };
}

function codesOf(
  compiled: ReturnType<typeof compileScene>,
  code: LintCode,
): Array<{ code: LintCode }> {
  return lintCompiled(compiled).filter((finding) => finding.code === code);
}

describe('texture — cluster floor (FR-10, AC-9)', () => {
  it('produces no CLUSTER_THIN at any profile or density', () => {
    for (const { profile, width } of SIZES) {
      for (const pattern of PATTERNS) {
        for (const density of [1, 2, 3]) {
          const compiled = compileScene([wall(width, width), texture(pattern, { density })], {
            width,
            height: width,
          });
          expect(codesOf(compiled, 'CLUSTER_THIN'), `${profile} ${pattern} d${density}`).toEqual(
            [],
          );
        }
      }
    }
  });

  it('keeps every mark at or above the profile minimum', () => {
    for (const { width, minCluster } of SIZES) {
      for (const pattern of PATTERNS) {
        const compiled = compileScene([wall(width, width), texture(pattern)], {
          width,
          height: width,
        });
        const sizes = clusterSizes(compiled, 'cloth.shadow');
        expect(sizes.length).toBeGreaterThan(0);
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(minCluster);
      }
    }
  });

  it('paints marks whole, so a mask edge cannot leave a sliver', () => {
    // A 30x30 island on a large canvas: every painted mark is a full 3x3 block.
    const compiled = compileScene(
      [
        { op: 'rect', x: 10, y: 10, w: 30, h: 30, color: 'cloth.base', part: 'wall' },
        texture('stipple'),
      ],
      { width: 128, height: 128, profile: 'large' },
    );
    const painted = pixelsOf(compiled, 'cloth.shadow');
    expect(painted.length).toBeGreaterThan(0);
    expect(painted.length % 9).toBe(0);
    for (const [x, y] of painted) {
      expect(x).toBeGreaterThanOrEqual(10);
      expect(x).toBeLessThan(40);
      expect(y).toBeGreaterThanOrEqual(10);
      expect(y).toBeLessThan(40);
    }
  });
});

describe('texture — emptiness (FR-12, NFR-4)', () => {
  it('no-ops with W_CLEANUP_NOOP when the part is smaller than one mark', () => {
    const compiled = compileScene(
      [
        { op: 'rect', x: 10, y: 10, w: 5, h: 5, color: 'cloth.base', part: 'wall' },
        texture('stipple'),
      ],
      { width: 128, height: 128, profile: 'large' },
    );
    expect(compiled.warnings.map((warning) => warning.code)).toContain('W_CLEANUP_NOOP');
    expect(pixelsOf(compiled, 'cloth.shadow')).toEqual([]);
    expect(compiled.cleanup?.[0]).toMatchObject({ op: 'texture', changed: 0, marks: 0 });
  });

  it('reports counts rather than coordinates', () => {
    const compiled = compileScene([wall(64, 64), texture('brick')], { width: 64, height: 64 });
    const report = compiled.cleanup?.[0];
    expect(report).toMatchObject({ op: 'texture', coords: [] });
    expect(report?.marks).toBeGreaterThan(0);
    expect(report?.changed).toBeGreaterThan(0);
    expect(report?.changed).toBe((report?.marks ?? 0) * 4);
  });
});

describe('texture — lint acceptance (FR-13, AC-11)', () => {
  it('is silent for DITHER_NOISE and CLUSTER_THIN at every profile', () => {
    for (const { width } of SIZES) {
      for (const pattern of PATTERNS) {
        const compiled = compileScene([wall(width, width), texture(pattern)], {
          width,
          height: width,
        });
        expect(codesOf(compiled, 'DITHER_NOISE'), pattern).toEqual([]);
        expect(codesOf(compiled, 'CLUSTER_THIN'), pattern).toEqual([]);
      }
    }
  });

  it('still reports CLUSTER_THIN for dither_fill below the floor', () => {
    const compiled = compileScene(
      [
        wall(128, 128),
        {
          op: 'dither_fill',
          x: 0,
          y: 0,
          w: 128,
          h: 128,
          color: 'cloth.shadow',
          pattern: 'checker_50',
          part: 'wall',
        },
      ],
      { width: 128, height: 128, profile: 'large' },
    );
    const findings = codesOf(compiled, 'CLUSTER_THIN');
    expect(findings.length).toBeGreaterThan(0);
  });
});

describe('texture — canonical form (FR-15)', () => {
  it('round-trips density and target_layer, and drops the default density', () => {
    const text = serializeRecipe(
      sceneRecipe([
        wall(64, 64),
        {
          op: 'texture',
          pattern: 'hatch',
          color: 'cloth.shadow',
          density: 3,
          target_layer: 'base',
          part: 'wall',
        },
      ]),
    );
    expect(text).toContain('"density": 3');
    expect(text).toContain('"target_layer": "base"');

    const plain = serializeRecipe(sceneRecipe([wall(64, 64), texture('hatch', { density: 2 })]));
    expect(plain).not.toContain('"density"');
    expect(plain).not.toContain('"target_layer"');
  });
});
