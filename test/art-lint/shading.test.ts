/**
 * `BANDING` and `PILLOW_SHADE`.
 *
 * A band is where the eye stops reading volume and starts reading a rule: the
 * same run, the same width, three lines deep. Pillow shading is the light
 * direction that never chose a side, so every edge shadows.
 */

import { describe, expect, it } from 'vitest';
import { lintCompiled } from '../../src/lint/index.js';
import type { LintFinding } from '../../src/lint/types.js';
import { compileSprite, ofCode } from './helpers.js';

const RAMP = {
  shadow: '#303030',
  base: '#808080',
  highlight: '#c0c0c0',
} as const;

const PART = { torso: { material: 'steel' } };

function findings(ops: unknown[]): LintFinding[] {
  return lintCompiled(
    compileSprite(ops, {
      palette: { steel: { ramp: { ...RAMP } } },
      parts: PART,
    }),
  );
}

describe('BANDING', () => {
  it('reports one band for four stacked equal runs', () => {
    const bands = ofCode(
      findings([{ op: 'rect', x: 4, y: 4, w: 8, h: 4, color: 'steel.base', part: 'torso' }]),
      'BANDING',
    );
    expect(bands).toHaveLength(1);
    expect(bands[0]).toMatchObject({ severity: 'info', coord: [4, 4], part: 'torso' });
    expect(bands[0]?.message).toContain('steel.base');
    expect(bands[0]?.message).toContain('equal runs of 8 px');
    expect(bands[0]?.coords).toHaveLength(8);
  });

  it('needs three rows before a band exists', () => {
    const bands = ofCode(
      findings([{ op: 'rect', x: 4, y: 4, w: 8, h: 2, color: 'steel.base', part: 'torso' }]),
      'BANDING',
    );
    expect(bands).toEqual([]);
  });

  it('splits bands separated by a one-row gap', () => {
    const bands = ofCode(
      findings([
        { op: 'rect', x: 4, y: 2, w: 8, h: 3, color: 'steel.base', part: 'torso' },
        { op: 'rect', x: 4, y: 5, w: 8, h: 1, color: 'steel.shadow', part: 'torso' },
        { op: 'rect', x: 4, y: 6, w: 8, h: 3, color: 'steel.base', part: 'torso' },
      ]),
      'BANDING',
    );
    expect(bands.map((band) => band.coord)).toEqual([
      [4, 2],
      [4, 6],
    ]);
  });

  it('keeps runs of different width apart', () => {
    const bands = ofCode(
      findings([
        { op: 'rect', x: 4, y: 4, w: 8, h: 1, color: 'steel.base', part: 'torso' },
        { op: 'rect', x: 4, y: 5, w: 6, h: 1, color: 'steel.base', part: 'torso' },
        { op: 'rect', x: 4, y: 6, w: 8, h: 1, color: 'steel.base', part: 'torso' },
      ]),
      'BANDING',
    );
    expect(bands).toEqual([]);
  });

  it('reports a band on plain artwork, without naming a part', () => {
    const compiled = compileSprite([{ op: 'rect', x: 4, y: 4, w: 8, h: 8, color: 'steel.base' }], {
      palette: { steel: { ramp: { ...RAMP } } },
    });
    const bands = ofCode(lintCompiled(compiled), 'BANDING');
    expect(bands).toHaveLength(1);
    expect(bands[0]?.part).toBeUndefined();
    expect(bands[0]?.message).toContain('The artwork stacks');
  });

  it('ignores a run that belongs to no declared part', () => {
    const bands = ofCode(
      findings([
        { op: 'rect', x: 4, y: 4, w: 8, h: 1, color: 'steel.base', part: 'torso' },
        { op: 'rect', x: 4, y: 5, w: 8, h: 1, color: 'steel.base' },
        { op: 'rect', x: 4, y: 6, w: 8, h: 1, color: 'steel.base', part: 'torso' },
      ]),
      'BANDING',
    );
    expect(bands).toEqual([]);
  });
});

describe('PILLOW_SHADE', () => {
  const box = (edges: readonly string[]): unknown[] => {
    const ops: unknown[] = [
      { op: 'rect', x: 4, y: 4, w: 8, h: 8, color: 'steel.base', part: 'orb' },
    ];
    if (edges.includes('top')) {
      ops.push({ op: 'rect', x: 4, y: 4, w: 8, h: 1, color: 'steel.shadow', part: 'orb' });
    }
    if (edges.includes('bottom')) {
      ops.push({ op: 'rect', x: 4, y: 11, w: 8, h: 1, color: 'steel.shadow', part: 'orb' });
    }
    if (edges.includes('left')) {
      ops.push({ op: 'rect', x: 4, y: 4, w: 1, h: 8, color: 'steel.shadow', part: 'orb' });
    }
    if (edges.includes('right')) {
      ops.push({ op: 'rect', x: 11, y: 4, w: 1, h: 8, color: 'steel.shadow', part: 'orb' });
    }
    return ops;
  };

  function orb(edges: readonly string[]) {
    return ofCode(
      lintCompiled(
        compileSprite(box(edges), {
          palette: { steel: { ramp: { ...RAMP } } },
          parts: { orb: { material: 'steel' } },
        }),
      ),
      'PILLOW_SHADE',
    );
  }

  it('fires when shadow rings all four edges', () => {
    const findings = orb(['top', 'bottom', 'left', 'right']);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: 'warning', coord: [4, 4], part: 'orb' });
    expect(findings[0]?.message).toContain('top, bottom, left and right');
  });

  it('fires when shadow dominates three edges', () => {
    const findings = orb(['top', 'bottom', 'left']);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('top, bottom and left');
    expect(findings[0]?.message).not.toContain('right');
  });

  it('stays silent when only two edges shadow', () => {
    expect(orb(['top', 'bottom'])).toEqual([]);
  });

  it('breaks role ties in favour of shadow', () => {
    const findings = ofCode(
      lintCompiled(
        compileSprite(
          [
            { op: 'rect', x: 4, y: 4, w: 8, h: 8, color: 'steel.base', part: 'orb' },
            { op: 'rect', x: 4, y: 4, w: 8, h: 1, color: 'steel.highlight', part: 'orb' },
            { op: 'rect', x: 4, y: 11, w: 8, h: 1, color: 'steel.shadow', part: 'orb' },
            { op: 'rect', x: 4, y: 4, w: 1, h: 8, color: 'steel.shadow', part: 'orb' },
            { op: 'rect', x: 11, y: 4, w: 1, h: 8, color: 'steel.shadow', part: 'orb' },
          ],
          {
            palette: { steel: { ramp: { ...RAMP } } },
            parts: { orb: { material: 'steel' } },
          },
        ),
      ),
      'PILLOW_SHADE',
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).not.toContain('top');
  });

  it('skips a part with fewer than eight boundary pixels', () => {
    const findings = ofCode(
      lintCompiled(
        compileSprite(
          [
            { op: 'set_pixels', points: [[5, 5]], color: 'steel.shadow', part: 'dot' },
            { op: 'set_pixels', points: [[7, 5]], color: 'steel.shadow', part: 'dot' },
            { op: 'set_pixels', points: [[9, 5]], color: 'steel.shadow', part: 'dot' },
          ],
          {
            palette: { steel: { ramp: { ...RAMP } } },
            parts: { dot: { material: 'steel' } },
          },
        ),
      ),
      'PILLOW_SHADE',
    );
    expect(findings).toEqual([]);
  });

  it('reports pillow shading on plain artwork, without naming a part', () => {
    const compiled = compileSprite(
      [{ op: 'rect', x: 4, y: 4, w: 8, h: 8, color: 'steel.shadow' }],
      { palette: { steel: { ramp: { ...RAMP } } } },
    );
    const findings = ofCode(lintCompiled(compiled), 'PILLOW_SHADE');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.part).toBeUndefined();
    expect(findings[0]?.message).toContain('The artwork is pillow-shaded');
  });
});
