/**
 * Texture lint fixtures: a checkerboard over a ramp, and thin clusters at two
 * canvas scales. The same shape is compiled twice in the CLUSTER cases on
 * purpose — the profile, not the artwork, decides what is grain.
 */

import { describe, expect, it } from 'vitest';
import { lintCompiled } from '../../src/lint/index.js';
import { compileSprite, ofCode } from './helpers.js';

const STEEL = { shadow: '#303030', base: '#808080', highlight: '#c0c0c0' };
const ORB = { orb: { material: 'steel' } };

/** Fill a region with the base tone, then dither a second tone over it. */
function checker(w: number, h: number, part?: string): unknown[] {
  const tagged = part === undefined ? {} : { part };
  return [
    { op: 'rect', x: 2, y: 2, w, h, color: 'steel.base', ...tagged },
    {
      op: 'dither_fill',
      x: 2,
      y: 2,
      w,
      h,
      color: 'steel.highlight',
      pattern: 'checker_50',
      ...tagged,
    },
  ];
}

describe('DITHER_NOISE', () => {
  it('fires on a 3-tone ramp where the profile bans dither', () => {
    const compiled = compileSprite(checker(10, 10, 'orb'), {
      width: 16,
      height: 16,
      palette: { steel: { ramp: { ...STEEL } } },
      parts: ORB,
    });
    const findings = ofCode(lintCompiled(compiled), 'DITHER_NOISE');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('info');
    expect(findings[0]?.part).toBe('orb');
    expect(findings[0]?.message).toContain('Part "orb"');
    expect(findings[0]?.message).toContain('81 checkerboard tiles');
    expect(findings[0]?.message).toContain('over 3 tones');
  });

  it('stays silent on a 5-step ramp at large', () => {
    const RAMP = {
      t0: '#f0f0f0',
      t1: '#c8c8c8',
      t2: '#a0a0a0',
      t3: '#787878',
      t4: '#505050',
    };
    const compiled = compileSprite(
      [
        { op: 'rect', x: 2, y: 2, w: 10, h: 10, color: 'ramp5.t3', part: 'orb' },
        {
          op: 'dither_fill',
          x: 2,
          y: 2,
          w: 10,
          h: 10,
          color: 'ramp5.t2',
          pattern: 'checker_50',
          part: 'orb',
        },
      ],
      {
        width: 160,
        height: 160,
        palette: { ramp5: { ramp: { ...RAMP } } },
        parts: { orb: { material: 'ramp5' } },
      },
    );
    expect(ofCode(lintCompiled(compiled), 'DITHER_NOISE')).toEqual([]);
  });

  it('fires when the material has fewer tones than a fade needs', () => {
    const compiled = compileSprite(
      [
        { op: 'rect', x: 2, y: 2, w: 8, h: 8, color: 'steel.t0', part: 'orb' },
        {
          op: 'dither_fill',
          x: 2,
          y: 2,
          w: 8,
          h: 8,
          color: 'steel.t1',
          pattern: 'checker_50',
          part: 'orb',
        },
      ],
      {
        width: 32,
        height: 32,
        palette: { steel: { ramp: { t0: '#808080', t1: '#303030' } } },
        parts: ORB,
      },
    );
    const findings = ofCode(lintCompiled(compiled), 'DITHER_NOISE');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('over 2 tones');
    expect(findings[0]?.message).toContain('a fade needs 3');
  });

  it('stays silent below the tile floor', () => {
    const compiled = compileSprite(
      [
        { op: 'rect', x: 2, y: 2, w: 10, h: 10, color: 'steel.base', part: 'orb' },
        {
          op: 'dither_fill',
          x: 2,
          y: 2,
          w: 2,
          h: 2,
          color: 'steel.highlight',
          pattern: 'checker_50',
          part: 'orb',
        },
      ],
      {
        width: 16,
        height: 16,
        palette: { steel: { ramp: { ...STEEL } } },
        parts: ORB,
      },
    );
    expect(ofCode(lintCompiled(compiled), 'DITHER_NOISE')).toEqual([]);
  });

  it('reports dither noise on plain artwork, without naming a part', () => {
    const compiled = compileSprite(checker(10, 10), {
      width: 16,
      height: 16,
      palette: { steel: { ramp: { ...STEEL } } },
    });
    const findings = ofCode(lintCompiled(compiled), 'DITHER_NOISE');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.part).toBeUndefined();
    expect(findings[0]?.message).toContain('The artwork dithers with 81 checkerboard tiles');
    expect(findings[0]?.message).toContain('over 2 tones');
  });
});

describe('CLUSTER_THIN', () => {
  const pair = [
    { op: 'rect', x: 4, y: 4, w: 6, h: 6, color: 'steel.base', part: 'orb' },
    {
      op: 'set_pixels',
      points: [
        [12, 12],
        [13, 12],
      ],
      color: 'steel.shadow',
      part: 'orb',
    },
  ];

  it('stays silent on tiny, where one pixel is a mark', () => {
    const compiled = compileSprite(pair, {
      width: 16,
      height: 16,
      palette: { steel: { ramp: { ...STEEL } } },
      parts: ORB,
    });
    expect(ofCode(lintCompiled(compiled), 'CLUSTER_THIN')).toEqual([]);
  });

  it('fires on the same shape at large, where three pixels are the floor', () => {
    const compiled = compileSprite(pair, {
      width: 160,
      height: 160,
      palette: { steel: { ramp: { ...STEEL } } },
      parts: ORB,
    });
    const findings = ofCode(lintCompiled(compiled), 'CLUSTER_THIN');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('info');
    expect(findings[0]?.part).toBe('orb');
    expect(findings[0]?.coord).toEqual([12, 12]);
    expect(findings[0]?.coords).toEqual([
      [12, 12],
      [13, 12],
    ]);
    expect(findings[0]?.message).toContain('1 cluster(s) smaller than 3 px');
  });

  it('keeps a cluster exactly at the floor', () => {
    const compiled = compileSprite(
      [
        { op: 'rect', x: 4, y: 4, w: 8, h: 8, color: 'steel.base', part: 'orb' },
        {
          op: 'set_pixels',
          points: [
            [20, 20],
            [21, 20],
            [22, 20],
          ],
          color: 'steel.shadow',
          part: 'orb',
        },
      ],
      {
        width: 160,
        height: 160,
        palette: { steel: { ramp: { ...STEEL } } },
        parts: ORB,
      },
    );
    expect(ofCode(lintCompiled(compiled), 'CLUSTER_THIN')).toEqual([]);
  });

  it('caps coordinates and keeps the exact count', () => {
    const points: number[][] = [];
    for (let i = 0; i < 51; i += 1) {
      points.push([4 + (i % 20) * 2, 4 + Math.floor(i / 20) * 2]);
    }
    const compiled = compileSprite(
      [{ op: 'set_pixels', points, color: 'steel.base', part: 'orb' }],
      {
        width: 160,
        height: 160,
        palette: { steel: { ramp: { ...STEEL } } },
        parts: ORB,
      },
    );
    const findings = ofCode(lintCompiled(compiled), 'CLUSTER_THIN');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.coords).toHaveLength(50);
    expect(findings[0]?.message).toContain('51 cluster(s)');
    expect(findings[0]?.message).toContain('first 50');
  });

  it('reports once per part', () => {
    const compiled = compileSprite(
      [
        { op: 'set_pixels', points: [[12, 12]], color: 'steel.base', part: 'orb' },
        { op: 'set_pixels', points: [[40, 40]], color: 'iron.t0', part: 'hilt' },
      ],
      {
        width: 160,
        height: 160,
        palette: {
          steel: { ramp: { ...STEEL } },
          iron: { ramp: { t0: '#202020', t1: '#404040' } },
        },
        parts: { orb: { material: 'steel' }, hilt: { material: 'iron' } },
      },
    );
    const findings = ofCode(lintCompiled(compiled), 'CLUSTER_THIN');
    expect(findings.map((finding) => finding.part).sort()).toEqual(['hilt', 'orb']);
  });

  it('reports thin clusters on plain artwork, without naming a part', () => {
    const compiled = compileSprite(
      [{ op: 'set_pixels', points: [[40, 40]], color: 'steel.base' }],
      {
        width: 160,
        height: 160,
        palette: { steel: { ramp: { ...STEEL } } },
      },
    );
    const findings = ofCode(lintCompiled(compiled), 'CLUSTER_THIN');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.part).toBeUndefined();
    expect(findings[0]?.coord).toEqual([40, 40]);
    expect(findings[0]?.message).toContain('The artwork has 1 cluster(s) smaller than 3 px');
  });
});
