/**
 * P2.T3 / FR-7 — ramp_fill and auto_shade resolve their target tone from the
 * owning part's design value, using only slots the palette already declares.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import type { IntentCase } from './helpers.js';
import { intentCase } from './helpers.js';

const cases: IntentCase[] = [];

afterEach(() => {
  while (cases.length > 0) {
    cases.pop()?.cleanup();
  }
});

function build(options: {
  values: Record<string, number>;
  op: 'ramp_fill' | 'auto_shade';
  palette?: Record<string, unknown>;
}): IntentCase {
  const built = intentCase({
    design: { values: options.values },
    palette: options.palette,
    ops: [
      {
        op: 'rect',
        x: 1,
        y: 1,
        w: 4,
        h: 4,
        color: options.palette === undefined ? 'steel.base' : 'steel.t0',
        part: 'body',
      },
      {
        op: 'rect',
        x: 5,
        y: 1,
        w: 2,
        h: 4,
        color: options.palette === undefined ? 'wood.base' : 'wood.t0',
        part: 'trim',
      },
      options.op === 'ramp_fill'
        ? { op: 'ramp_fill', bands: 3, light_dir: 'top-left' }
        : { op: 'auto_shade', light_dir: 'top-left' },
    ],
  });
  cases.push(built);
  return built;
}

function slotAt(built: IntentCase, x: number, y: number): string {
  const compiled = compileRecipe(built.recipe);
  const slot = compiled.flattened[y * compiled.width + x] ?? -1;
  return compiled.slots.names[slot] ?? '<transparent>';
}

describe('design values drive ramp targets', () => {
  it('maps 1 to the darkest role and 5 to the lightest role per part', () => {
    const built = build({ values: { body: 1, trim: 5 }, op: 'ramp_fill' });
    expect(slotAt(built, 3, 2)).toBe('steel.shadow');
    expect(slotAt(built, 5, 2)).toBe('wood.highlight');
  });

  it('maps 3 to the middle of a numbered tone ladder', () => {
    const palette = {
      steel: { ramp: { t0: '#f4f4f4', t1: '#c0c0c0', t2: '#808080', t3: '#404040' } },
      wood: { ramp: { t0: '#f0e0c0', t1: '#c0a060', t2: '#806020', t3: '#402010' } },
    };
    const built = build({ values: { body: 3, trim: 3 }, op: 'ramp_fill', palette });
    // Four tones put the middle value between t1 and t2; ties go darker.
    expect(slotAt(built, 3, 2)).toBe('steel.t2');
    expect(slotAt(built, 5, 2)).toBe('wood.t2');
  });

  it('uses the same target tone when auto_shade paints a rim', () => {
    const built = build({ values: { body: 2, trim: 4 }, op: 'auto_shade' });
    expect(slotAt(built, 1, 1)).toBe('steel.shadow');
    expect(slotAt(built, 5, 1)).toBe('wood.base');
  });
});
