/**
 * Deterministic branch coverage for the pure judgement-view helpers (F1, AC-17).
 *
 * The CLI view tests cover the rendered pixels; these tests drive the helper
 * entry points directly so the path-naming and palette-fallback arms are
 * measured as well. Each case asserts a concrete output, not a smoke import.
 */

import { describe, expect, it } from 'vitest';
import { compileRecipe, compileRecipeFrames } from '../../src/core/compile.js';
import type { PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { rasterizeSlots } from '../../src/render/flatten.js';
import { decodePng } from '../../src/render/png.js';
import {
  parseOnionIndex,
  parseSteps,
  renderBlockout,
  renderOnion,
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

/** A tiny two-frame recipe: frame 0 paints the left half, frame 1 the right. */
function framedCompiled() {
  const raw = {
    version: '1.4',
    meta: { name: 'onion', width: 8, height: 8, alpha_mode: 'binary' },
    palette: { ink: { colors: ['#111111', '#eeeeee'] } },
    layers: [
      {
        id: 'base',
        ops: [{ op: 'rect', x: 0, y: 0, w: 4, h: 8, color: 'ink.0' }],
      },
    ],
    frames: [
      {
        id: 'move',
        layers: [
          {
            id: 'base',
            ops: [{ op: 'rect', x: 4, y: 0, w: 4, h: 8, color: 'ink.1' }],
          },
        ],
      },
    ],
  };
  return compileRecipeFrames(parseRecipe(JSON.stringify(raw)).recipe);
}

/** True when every pixel in one 4-wide panel of a strip is transparent. */
function panelIsBlank(rgba: Uint8Array, width: number, height: number, panel: number): boolean {
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const index = (row * width * 3 + panel * width + col) * 4;
      if ((rgba[index + 3] ?? 0) !== 0) {
        return false;
      }
    }
  }
  return true;
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

  it('names onion sibling paths with the exact index', () => {
    expect(viewPath('hero.png', { kind: 'onion', index: 0 })).toBe('hero.onion0.png');
    expect(viewPath('hero.png', { kind: 'onion', index: 3 })).toBe('hero.onion3.png');
    expect(viewPath('hero', { kind: 'onion', index: 1 })).toBe('hero.onion1.png');
  });

  it('parses non-negative whole onion indices and rejects the rest', () => {
    expect(parseOnionIndex('0')).toBe(0);
    expect(parseOnionIndex('2')).toBe(2);
    for (const value of [undefined, 'abc', '-1', '1.5', '']) {
      let caught: unknown;
      try {
        parseOnionIndex(value);
      } catch (error) {
        caught = error;
      }
      expect(codeOf(caught), `expected E_BAD_PARAM for ${String(value)}`).toBe('E_BAD_PARAM');
    }
  });

  it('composites a deterministic prev | selected | next strip with blank boundaries', () => {
    const frames = framedCompiled();
    const first = renderOnion(frames, 0);
    const second = renderOnion(frames, 0);
    expect(first.png).toEqual(second.png);

    const decoded = decodePng(first.png);
    expect({ width: decoded.width, height: decoded.height }).toEqual({ width: 24, height: 8 });
    expect(decoded.rgba).toEqual(first.rgba);

    // Selected index 0: no previous frame, so the left panel is blank.
    expect(panelIsBlank(decoded.rgba, 8, 8, 0)).toBe(true);
    expect(panelIsBlank(decoded.rgba, 8, 8, 1)).toBe(false);
    expect(panelIsBlank(decoded.rgba, 8, 8, 2)).toBe(false);

    // The center panel must equal the frame-0 render, and the right panel the
    // frame-1 render, byte for byte at their panel offsets.
    const selected = frames[0];
    const next = frames[1];
    if (selected === undefined || next === undefined) {
      throw new Error('expected two compiled frames');
    }
    const frame0 = rasterizeSlots(selected.compiled.flattened, 8, 8, selected.compiled.slots);
    const frame1 = rasterizeSlots(next.compiled.flattened, 8, 8, next.compiled.slots);
    for (let row = 0; row < 8; row += 1) {
      expect(decoded.rgba.slice((row * 24 + 8) * 4, (row * 24 + 16) * 4)).toEqual(
        frame0.slice(row * 32, (row + 1) * 32),
      );
      expect(decoded.rgba.slice((row * 24 + 16) * 4, (row * 24 + 24) * 4)).toEqual(
        frame1.slice(row * 32, (row + 1) * 32),
      );
    }

    // Selected index 1 (last frame): no next frame, so the right panel is blank.
    const last = decodePng(renderOnion(frames, 1).png);
    expect(panelIsBlank(last.rgba, 8, 8, 0)).toBe(false);
    expect(panelIsBlank(last.rgba, 8, 8, 1)).toBe(false);
    expect(panelIsBlank(last.rgba, 8, 8, 2)).toBe(true);
  });
});
