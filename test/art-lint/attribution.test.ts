/**
 * Attribution contract (FR-20): an art finding names the part whose pixels it
 * blames, and it does so only when those pixels belong to one declared part. The
 * four original codes keep their severities and are not retrofitted with a part.
 */

import { describe, expect, it } from 'vitest';
import type { CompiledRecipe } from '../../src/core/compile.js';
import { LINT_RULES, lintBlocks, lintCompiled } from '../../src/lint/index.js';
import type { LintCode, LintSeverity } from '../../src/lint/types.js';
import { compileSprite, ofCode } from './helpers.js';

const STEEL = { shadow: '#303030', base: '#808080', highlight: '#c0c0c0' };
const BLADE = { blade: { material: 'steel' } };

function sprite(ops: unknown[]): CompiledRecipe {
  return compileSprite(ops, {
    width: 16,
    height: 16,
    palette: { steel: { ramp: { ...STEEL } } },
    parts: BLADE,
  });
}

/** One firing fixture per art code, and the part the finding must name. */
const FIRING: ReadonlyArray<{
  code: LintCode;
  ops: unknown[];
  part: string;
  parts?: Record<string, { material: string }>;
  size?: number;
}> = [
  {
    code: 'VALUE_COLLISION',
    part: 'blade',
    parts: { blade: { material: 'steel' }, guard: { material: 'iron' } },
    ops: [
      { op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'steel.base', part: 'blade' },
      { op: 'rect', x: 8, y: 0, w: 8, h: 8, color: 'iron.base', part: 'guard' },
    ],
  },
  {
    code: 'BANDING',
    part: 'blade',
    ops: [{ op: 'rect', x: 2, y: 2, w: 8, h: 8, color: 'steel.base', part: 'blade' }],
  },
  {
    code: 'PILLOW_SHADE',
    part: 'blade',
    ops: [
      { op: 'rect', x: 2, y: 2, w: 10, h: 10, color: 'steel.base', part: 'blade' },
      { op: 'rect', x: 2, y: 2, w: 10, h: 1, color: 'steel.shadow', part: 'blade' },
      { op: 'rect', x: 2, y: 11, w: 10, h: 1, color: 'steel.shadow', part: 'blade' },
      { op: 'rect', x: 2, y: 2, w: 1, h: 10, color: 'steel.shadow', part: 'blade' },
      { op: 'rect', x: 11, y: 2, w: 1, h: 10, color: 'steel.shadow', part: 'blade' },
    ],
  },
  {
    code: 'DITHER_NOISE',
    part: 'blade',
    ops: [
      { op: 'rect', x: 2, y: 2, w: 10, h: 10, color: 'steel.base', part: 'blade' },
      {
        op: 'dither_fill',
        x: 2,
        y: 2,
        w: 10,
        h: 10,
        color: 'steel.highlight',
        pattern: 'checker_50',
        part: 'blade',
      },
    ],
  },
  {
    code: 'CLUSTER_THIN',
    part: 'blade',
    size: 160,
    ops: [{ op: 'set_pixels', points: [[8, 8]], color: 'steel.base', part: 'blade' }],
  },
  {
    code: 'SILHOUETTE_LOSS',
    part: 'blade',
    ops: [{ op: 'rect', x: 2, y: 2, w: 8, h: 8, color: 'steel.base', part: 'blade' }],
  },
];

describe('attribution', () => {
  it('pins the severity of every code', () => {
    const severities: Record<string, LintSeverity> = {};
    for (const rule of LINT_RULES) {
      severities[rule.code] = rule.severity;
    }
    expect(severities).toEqual({
      OUT_OF_BOUNDS: 'warning',
      ORPHAN_PIXEL: 'warning',
      JAGGY_LINE: 'info',
      LOW_CONTRAST: 'warning',
      VALUE_COLLISION: 'warning',
      BANDING: 'info',
      PILLOW_SHADE: 'warning',
      DITHER_NOISE: 'info',
      CLUSTER_THIN: 'info',
      RAMP_NONMONOTONIC: 'warning',
      SILHOUETTE_LOSS: 'warning',
    });
  });

  for (const fixture of FIRING) {
    it(`names the part for ${fixture.code}`, () => {
      const size = fixture.size ?? 16;
      const compiled = compileSprite(fixture.ops, {
        width: size,
        height: size,
        palette: {
          steel: { ramp: { ...STEEL } },
          iron: { ramp: { shadow: '#303030', base: '#808080', highlight: '#c0c0c0' } },
        },
        parts: fixture.parts ?? BLADE,
      });
      const findings = ofCode(lintCompiled(compiled), fixture.code);
      expect(findings.length).toBeGreaterThan(0);
      for (const finding of findings) {
        expect(finding.part).toBe(fixture.part);
      }
    });
  }

  it('leaves the four original codes un-attributed', () => {
    const jaggies = [
      {
        op: 'set_pixels',
        points: [
          [0, 0],
          [0, 1],
          [1, 2],
          [2, 3],
          [2, 4],
          [2, 5],
        ],
        color: 'steel.base',
        part: 'blade',
      },
    ];
    const cases: ReadonlyArray<{ code: LintCode; ops: unknown[] }> = [
      {
        code: 'OUT_OF_BOUNDS',
        ops: [{ op: 'rect', x: 14, y: 0, w: 8, h: 4, color: 'steel.base', part: 'blade' }],
      },
      {
        code: 'ORPHAN_PIXEL',
        ops: [{ op: 'set_pixels', points: [[8, 8]], color: 'steel.shadow', part: 'blade' }],
      },
      { code: 'JAGGY_LINE', ops: jaggies },
      {
        code: 'LOW_CONTRAST',
        ops: [{ op: 'rect', x: 2, y: 2, w: 8, h: 8, color: 'steel.base', part: 'blade' }],
      },
    ];
    for (const fixture of cases) {
      const findings = ofCode(lintCompiled(sprite(fixture.ops)), fixture.code);
      expect(findings.length).toBeGreaterThan(0);
      for (const finding of findings) {
        expect(Object.hasOwn(finding, 'part')).toBe(false);
      }
    }
  });

  it('still promotes warnings only under strict', () => {
    const warning = { code: 'VALUE_COLLISION' as const, severity: 'warning' as const, message: '' };
    const info = { code: 'BANDING' as const, severity: 'info' as const, message: '' };
    expect(lintBlocks([warning], true)).toBe(true);
    expect(lintBlocks([warning], false)).toBe(false);
    expect(lintBlocks([info], true)).toBe(false);
  });

  it('sorts warnings before info for the new codes', () => {
    const compiled = compileSprite(
      [
        { op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'steel.base', part: 'blade' },
        { op: 'rect', x: 8, y: 0, w: 8, h: 8, color: 'iron.base', part: 'guard' },
      ],
      {
        width: 16,
        height: 16,
        palette: {
          steel: { ramp: { ...STEEL } },
          iron: { ramp: { shadow: '#303030', base: '#808080', highlight: '#c0c0c0' } },
        },
        parts: { blade: { material: 'steel' }, guard: { material: 'iron' } },
      },
    );
    const codes = lintCompiled(compiled).map((finding) => finding.code);
    expect(codes).toContain('VALUE_COLLISION');
    expect(codes).toContain('BANDING');
    expect(codes.indexOf('BANDING')).toBeGreaterThan(codes.indexOf('VALUE_COLLISION'));
  });
});
