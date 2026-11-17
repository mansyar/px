/**
 * Deterministic branch coverage for the pure judgement-view helpers (F1, AC-17).
 *
 * The CLI view tests cover the rendered pixels; these tests drive the helper
 * entry points directly so the path-naming and palette-fallback arms are
 * measured as well. Each case asserts a concrete output, not a smoke import.
 */

import { describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import type { PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { decodePng } from '../../src/render/png.js';
import {
  parseSteps,
  renderBlockout,
  renderValues,
  renderView,
  VALUES_MAX,
  VALUES_MIN,
  viewPath,
} from '../../src/render/views.js';

function compiled(palette: Record<string, unknown>) {
  const raw = {
    version: '1.1',
    meta: { name: 'view', width: 8, height: 8, alpha_mode: 'binary' },
    palette,
    parts: {},
    anchors: {},
    layers: [
      {
        id: 'base',
        ops: [
          {
            op: 'rect',
            x: 0,
            y: 0,
            w: 4,
            h: 4,
            color: `${Object.keys(palette)[0]}.0`,
          },
        ],
      },
    ],
  };
  return compileRecipe(parseRecipe(JSON.stringify(raw)).recipe);
}

function codeOf(error: unknown): string | undefined {
  return (error as PxError).code;
}

describe('pure render view helpers', () => {
  it('derives sibling view paths from stems with and without a .png suffix', () => {
    expect(viewPath('hero', { kind: 'blockout' })).toBe('hero.blockout.png');
    expect(viewPath('hero.png', { kind: 'values', steps: 5 })).toBe('hero.values5.png');
    expect(viewPath('hero.png', { kind: 'blockout' })).toBe('hero.blockout.png');
  });

  it('parses the inclusive step range and rejects a missing count', () => {
    expect(parseSteps(String(VALUES_MIN))).toBe(VALUES_MIN);
    expect(parseSteps(String(VALUES_MAX))).toBe(VALUES_MAX);
    let caught: unknown;
    try {
      parseSteps(undefined);
    } catch (error) {
      caught = error;
    }
    expect(codeOf(caught)).toBe('E_BAD_PARAM');
  });

  it('keeps original flat slots when the palette declares no ramp family', () => {
    const view = renderBlockout(compiled({ ink: { colors: ['#111111'] } }), 'top-left');
    const decoded = decodePng(view.png);
    expect(decoded.rgba).toEqual(view.rgba);
    expect(Array.from(decoded.rgba.slice(0, 4))).toEqual([0x11, 0x11, 0x11, 0xff]);
    expect(decoded.rgba[7 * 4 + 3]).toBe(0);
  });

  it('posterises each opaque pixel and dispatches the same values view', () => {
    const rgba = new Uint8Array(4 * 4);
    rgba.set([255, 255, 255, 255], 0);
    rgba.set([0, 0, 0, 0], 4);
    rgba.set([0, 0, 0, 255], 8);
    rgba.set([128, 128, 128, 255], 12);
    const view = renderValues(2, 2, rgba, 4);
    const decoded = decodePng(view.png);
    expect(Array.from(decoded.rgba.slice(0, 4))).toEqual([255, 255, 255, 255]);
    expect(Array.from(decoded.rgba.slice(4, 8))).toEqual([0, 0, 0, 0]);
    expect(Array.from(decoded.rgba.slice(8, 12))).toEqual([0, 0, 0, 255]);
    expect(Array.from(decoded.rgba.slice(12, 16))).toEqual([170, 170, 170, 255]);
    const full = new Uint8Array(8 * 8 * 4);
    for (let index = 0; index < full.length; index += 4) {
      full.set([index % 256, 0, 0, 255], index);
    }
    const viaView = renderView(
      { kind: 'values', steps: 4 },
      compiled({ ink: { colors: ['#111111'] } }),
      full,
      'top-left',
    );
    expect(viaView.png).toEqual(renderValues(8, 8, full, 4).png);
  });

  it('refuses to encode a truncated RGBA buffer instead of emitting a short PNG', () => {
    let caught: unknown;
    try {
      renderValues(1, 1, new Uint8Array([200, 200]), 4);
    } catch (error) {
      caught = error;
    }
    expect(codeOf(caught)).toBe('E_INTERNAL');
  });
});
