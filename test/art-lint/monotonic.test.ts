/**
 * `RAMP_NONMONOTONIC` fixtures. The rule reads the palette, so these recipes
 * need no pixels at all — an unpainted 8x8 canvas is enough to judge a family.
 */

import { describe, expect, it } from 'vitest';
import type { CompiledRecipe } from '../../src/core/compile.js';
import { lintCompiled } from '../../src/lint/index.js';
import { compileSprite, ofCode } from './helpers.js';

function family(ramp: Record<string, string>): CompiledRecipe {
  return compileSprite([], { width: 8, height: 8, palette: { steel: { ramp } } });
}

describe('RAMP_NONMONOTONIC', () => {
  it('fires on a tone family that brightens mid-ramp', () => {
    const findings = ofCode(
      lintCompiled(family({ t0: '#ffffff', t1: '#111111', t2: '#eeeeee', t3: '#222222' })),
      'RAMP_NONMONOTONIC',
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe('warning');
    expect(findings[0]?.part).toBeUndefined();
    expect(findings[0]?.message).toContain('Palette family "steel"');
    expect(findings[0]?.message).toContain('steel.t1 (#111111)');
    expect(findings[0]?.message).toContain('steel.t2 (#eeeeee)');
  });

  it('fires on a classic family whose highlight is not the lightest', () => {
    const findings = ofCode(
      lintCompiled(family({ highlight: '#808080', base: '#909090', shadow: '#303030' })),
      'RAMP_NONMONOTONIC',
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('steel.highlight');
    expect(findings[0]?.message).toContain('steel.base');
  });

  it('treats equal adjacent tones as a break', () => {
    const findings = ofCode(
      lintCompiled(family({ t0: '#ffffff', t1: '#888888', t2: '#888888' })),
      'RAMP_NONMONOTONIC',
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('steel.t1');
    expect(findings[0]?.message).toContain('steel.t2');
  });

  it('reports one warning for the first break only', () => {
    const findings = ofCode(
      lintCompiled(
        family({ t0: '#ffffff', t1: '#000000', t2: '#888888', t3: '#999999', t4: '#111111' }),
      ),
      'RAMP_NONMONOTONIC',
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('steel.t1');
    expect(findings[0]?.message).toContain('steel.t2');
  });

  it('stays silent on a monotonic five-step ramp', () => {
    const compiled = family({
      t0: '#f0f0f0',
      t1: '#c8c8c8',
      t2: '#a0a0a0',
      t3: '#787878',
      t4: '#505050',
    });
    expect(ofCode(lintCompiled(compiled), 'RAMP_NONMONOTONIC')).toEqual([]);
  });

  it('skips families with fewer than three tones', () => {
    expect(
      ofCode(lintCompiled(family({ shadow: '#ffffff', base: '#000000' })), 'RAMP_NONMONOTONIC'),
    ).toEqual([]);
  });

  it('skips flat families', () => {
    const compiled = compileSprite([], {
      width: 8,
      height: 8,
      palette: { ink: { colors: ['#ffffff', '#000000', '#808080'] } },
    });
    expect(ofCode(lintCompiled(compiled), 'RAMP_NONMONOTONIC')).toEqual([]);
  });
});
