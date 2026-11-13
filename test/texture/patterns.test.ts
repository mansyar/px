import { describe, expect, it } from 'vitest';
import { PxError } from '../../src/core/errors.js';
import { clusterSizes, compileScene, NO_OUTLINE, pixelsOf, wall } from './support.js';

const PATTERNS = ['stipple', 'hatch', 'grain', 'brick', 'mottle'] as const;

function codeOf(run: () => void): string {
  try {
    run();
    return 'NO_THROW';
  } catch (error) {
    return error instanceof PxError ? error.code : 'NOT_PX';
  }
}

function texture(pattern: string, color: unknown = 'cloth.shadow', extra: object = {}): unknown {
  return { op: 'texture', pattern, color, part: 'wall', ...extra };
}

describe('texture — patterns (FR-9, FR-11)', () => {
  it('renders five distinct patterns over the same part', () => {
    const renders = PATTERNS.map((pattern) =>
      compileScene([wall(128, 128), texture(pattern)], { width: 128, height: 128 }).flattened.join(
        ',',
      ),
    );
    expect(new Set(renders).size).toBe(5);
  });

  it('renders the same bytes on a second compile', () => {
    for (const pattern of PATTERNS) {
      const first = compileScene([wall(64, 64), texture(pattern)], { width: 64, height: 64 });
      const second = compileScene([wall(64, 64), texture(pattern)], { width: 64, height: 64 });
      expect(first.flattened).toEqual(second.flattened);
    }
  });

  it('grows the mark with the profile at the same density', () => {
    const tiny = compileScene([wall(16, 16), texture('stipple')], { width: 16, height: 16 });
    expect(tiny.profile).toBe('tiny');
    // tiny: mark 1, gap 2 — one pixel per mark, three pixels apart.
    expect(pixelsOf(tiny, 'cloth.shadow')).toContainEqual([0, 0]);
    expect(pixelsOf(tiny, 'cloth.shadow')).not.toContainEqual([1, 0]);
    expect(new Set(clusterSizes(tiny, 'cloth.shadow'))).toEqual(new Set([1]));

    const large = compileScene([wall(256, 256), texture('stipple')], { width: 256, height: 256 });
    expect(large.profile).toBe('large');
    // large: mark 3, gap 6 — a 3x3 block per mark, nine pixels apart.
    expect(pixelsOf(large, 'cloth.shadow')).toContainEqual([2, 2]);
    expect(pixelsOf(large, 'cloth.shadow')).not.toContainEqual([3, 3]);
    expect(new Set(clusterSizes(large, 'cloth.shadow'))).toEqual(new Set([9]));
  });

  it('scales the gap, not the mark, with density', () => {
    const counts = [1, 2, 3].map(
      (density) =>
        pixelsOf(
          compileScene([wall(128, 128), texture('stipple', 'cloth.shadow', { density })], {
            width: 128,
            height: 128,
          }),
          'cloth.shadow',
        ).length,
    );
    expect(counts[0]).toBeLessThan(counts[1] ?? 0);
    expect(counts[1]).toBeLessThan(counts[2] ?? 0);
  });

  it('resolves a bare ramp role against the part material', () => {
    const role = compileScene([wall(64, 64), texture('stipple', 'shadow')], {
      width: 64,
      height: 64,
    });
    const named = compileScene([wall(64, 64), texture('stipple', 'cloth.shadow')], {
      width: 64,
      height: 64,
    });
    expect(role.flattened).toEqual(named.flattened);
  });
});

describe('texture — rejections (FR-12)', () => {
  it('names the legal patterns for an unknown one', () => {
    expect(
      codeOf(() => compileScene([wall(64, 64), texture('noise')], { width: 64, height: 64 })),
    ).toBe('E_PATTERN_UNKNOWN');
  });

  it('requires a pattern', () => {
    expect(
      codeOf(() =>
        compileScene([wall(64, 64), { op: 'texture', color: 'cloth.shadow', part: 'wall' }], {
          width: 64,
          height: 64,
        }),
      ),
    ).toBe('E_MISSING_PARAM');
  });

  it('rejects a density outside 1-3', () => {
    for (const density of [0, 4, 1.5]) {
      expect(
        codeOf(() =>
          compileScene([wall(64, 64), texture('stipple', 'cloth.shadow', { density })], {
            width: 64,
            height: 64,
          }),
        ),
      ).toBe('E_BAD_PARAM');
    }
  });

  it('rejects a texture with no part to cover', () => {
    expect(
      codeOf(() =>
        compileScene([wall(64, 64), { op: 'texture', pattern: 'stipple', color: 'cloth.shadow' }], {
          width: 64,
          height: 64,
        }),
      ),
    ).toBe('E_BAD_PARAM');
  });

  it('raises E_NO_RAMP for a role the material does not have', () => {
    expect(
      codeOf(() =>
        compileScene([wall(64, 64), texture('stipple', 'outline')], {
          width: 64,
          height: 64,
          palette: NO_OUTLINE,
        }),
      ),
    ).toBe('E_NO_RAMP');
  });
});
