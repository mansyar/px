/**
 * `SILHOUETTE_LOSS` fixtures: one part, several backdrops. The rule answers a
 * question about a background, so the same recipe reports differently depending
 * on the panel the caller asks to check.
 */

import { describe, expect, it } from 'vitest';
import { parseHex } from '../../src/core/palette.js';
import { lintCompiled } from '../../src/lint/index.js';
import { compileSprite, ofCode } from './helpers.js';

const GREY = { ramp: { shadow: '#303030', base: '#808080', highlight: '#c0c0c0' } };
const ORB = { orb: { material: 'steel' } };

function orb(width = 16): ReturnType<typeof compileSprite> {
  return compileSprite([{ op: 'rect', x: 4, y: 4, w: 8, h: 8, color: 'steel.base', part: 'orb' }], {
    width,
    height: width,
    palette: { steel: GREY },
    parts: ORB,
  });
}

function backdrop(hex: string) {
  const parsed = parseHex(hex);
  if (parsed === null) {
    throw new Error(`bad hex ${hex}`);
  }
  return parsed;
}

describe('SILHOUETTE_LOSS', () => {
  it('fires when a part melts into the default grey backdrop', () => {
    const findings = ofCode(lintCompiled(orb()), 'SILHOUETTE_LOSS');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('warning');
    expect(findings[0]?.part).toBe('orb');
    expect(findings[0]?.message).toContain('Part "orb"');
    expect(findings[0]?.message).toContain('#808080');
    expect(findings[0]?.message).toContain('1.00:1');
  });

  it('reports per background: the same part passes on black', () => {
    expect(ofCode(lintCompiled(orb(), backdrop('#000000')), 'SILHOUETTE_LOSS')).toEqual([]);
  });

  it('names the backdrop it was asked to check', () => {
    const findings = ofCode(lintCompiled(orb(), backdrop('#8a8a8a')), 'SILHOUETTE_LOSS');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('#8a8a8a');
    expect(findings[0]?.message).not.toContain('backdrop #808080');
  });

  it('uses the profile ratio: one tone fails at tiny and passes at large', () => {
    const pale = { ramp: { shadow: '#303030', base: '#a5a5a5', highlight: '#f0f0f0' } };
    const ops = [{ op: 'rect', x: 4, y: 4, w: 8, h: 8, color: 'steel.base', part: 'orb' }];
    const tiny = compileSprite(ops, {
      width: 16,
      height: 16,
      palette: { steel: pale },
      parts: ORB,
    });
    const large = compileSprite(ops, {
      width: 160,
      height: 160,
      palette: { steel: pale },
      parts: ORB,
    });
    expect(ofCode(lintCompiled(tiny), 'SILHOUETTE_LOSS')).toHaveLength(1);
    expect(ofCode(lintCompiled(large), 'SILHOUETTE_LOSS')).toEqual([]);
  });

  it('stays silent without declared parts', () => {
    const compiled = compileSprite([{ op: 'rect', x: 4, y: 4, w: 8, h: 8, color: 'steel.base' }], {
      width: 16,
      height: 16,
      palette: { steel: GREY },
    });
    expect(ofCode(lintCompiled(compiled), 'SILHOUETTE_LOSS')).toEqual([]);
  });

  it('stays silent when the material has no base role', () => {
    const compiled = compileSprite(
      [{ op: 'rect', x: 4, y: 4, w: 8, h: 8, color: 'ink.0', part: 'dab' }],
      {
        width: 16,
        height: 16,
        palette: { ink: { colors: ['#808080', '#303030'] } },
        parts: { dab: { material: 'ink' } },
      },
    );
    expect(ofCode(lintCompiled(compiled), 'SILHOUETTE_LOSS')).toEqual([]);
  });
});
