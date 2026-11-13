import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { compileRecipe } from '../../src/core/compile.js';
import { PxError } from '../../src/core/errors.js';
import { parseHex } from '../../src/core/palette.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { RampRole, Recipe } from '../../src/core/recipe/types.js';
import {
  DERIVATION_NOTE,
  deriveRamps,
  PALETTE_NAMES,
  PALETTES,
  paletteByName,
} from '../../src/palettes/index.js';
import { circularHueDistance, hueOf, relativeLuminance } from '../../src/palettes/luminance.js';

let workspace = '';

const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

type Ramped = Record<string, { ramp: Partial<Record<RampRole, string>> }>;

/** Derivation always returns ramp families; the cast keeps the assertions direct. */
function derive(colors: string[], prefix?: string): Ramped {
  return deriveRamps(colors, prefix) as unknown as Ramped;
}

function run(args: string[]): { code: number; envelope: Record<string, unknown> } {
  let raw = '';
  const code = runCli(args, {
    cwd: workspace,
    stdout: (text) => {
      raw += text;
    },
    stderr: () => undefined,
  });
  return { code, envelope: JSON.parse(raw) as Record<string, unknown> };
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-palettes-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('curated palettes', () => {
  it('ships the canonical colour counts', () => {
    expect(PALETTES.pico8?.colors).toHaveLength(16);
    expect(PALETTES.endesga32?.colors).toHaveLength(32);
    expect(PALETTES.arne16?.colors).toHaveLength(16);
    expect(PALETTES.gameboy?.colors).toEqual(['#0f380f', '#306230', '#8bac0f', '#9bbc0f']);
  });

  it('uses canonical values, not approximations', () => {
    expect(PALETTES.pico8?.colors.slice(0, 4)).toEqual([
      '#000000',
      '#1d2b53',
      '#7e2553',
      '#008751',
    ]);
    expect(PALETTES.pico8?.colors.at(-1)).toBe('#ffccaa');
    expect(PALETTES.endesga32?.colors[0]).toBe('#be4a2f');
    expect(PALETTES.endesga32?.colors).toContain('#8b9bb4');
    expect(PALETTES.arne16?.colors[1]).toBe('#9d9d9d');
    expect(PALETTES.arne16?.colors.at(-1)).toBe('#b2dcef');
  });

  it('keeps every entry a unique, parseable, lowercase hex', () => {
    for (const definition of Object.values(PALETTES)) {
      expect(new Set(definition.colors).size).toBe(definition.colors.length);
      for (const hex of definition.colors) {
        expect(hex).toMatch(HEX);
        expect(hex).toBe(hex.toLowerCase());
        expect(parseHex(hex)).not.toBeNull();
      }
    }
  });

  it('resolves names case-insensitively and knows its own list', () => {
    expect(paletteByName('PICO8')).toBe(PALETTES.pico8);
    expect(paletteByName('nope')).toBeUndefined();
    expect(PALETTE_NAMES).toEqual(['pico8', 'endesga32', 'arne16', 'gameboy']);
  });
});

describe('ramp derivation', () => {
  const gray = ['#000000', '#808080', '#ffffff'];

  it('gives each colour a family with base and its neighbours', () => {
    const palette = derive(gray);
    expect(Object.keys(palette)).toEqual(['c0', 'c1', 'c2']);
    expect(palette.c0?.ramp).toEqual({ base: '#000000', highlight: '#808080' });
    expect(palette.c1?.ramp).toEqual({
      base: '#808080',
      outline: '#000000',
      shadow: '#000000',
      highlight: '#ffffff',
    });
    expect(palette.c2?.ramp).toEqual({
      base: '#ffffff',
      outline: '#000000',
      shadow: '#808080',
    });
  });

  it('leaves the missing end roles absent rather than synthesising them', () => {
    const palette = derive(gray);
    expect(palette.c0?.ramp.shadow).toBeUndefined();
    expect(palette.c2?.ramp.highlight).toBeUndefined();
    for (const family of Object.values(palette)) {
      if ('ramp' in family) {
        for (const hex of Object.values(family.ramp)) {
          expect(gray).toContain(hex);
        }
      }
    }
  });

  it('is deterministic', () => {
    expect(derive(gray)).toEqual(derive(gray));
  });

  it('picks the outline by circular hue distance, not by luminance', () => {
    const palette = derive(['#ff8000', '#0000ff', '#00a000', '#a05000']);
    // #a05000 is the darkest but also the nearest hue (about 0 degrees away).
    expect(palette.c0?.ramp.outline).toBe('#a05000');
    expect(palette.c0?.ramp.shadow).toBe('#00a000');
  });

  it('breaks a hue tie with lower luminance, then palette order', () => {
    const palette = derive(['#808000', '#008000', '#800000']);
    expect(palette.c0?.ramp.outline).toBe('#800000');
  });

  it('names families from the prefix so a recipe reads back to the palette', () => {
    expect(Object.keys(derive(['#000000', '#ffffff'], 'pico8_'))).toEqual(['pico8_0', 'pico8_1']);
  });

  it('lifts a curated palette into one family per colour', () => {
    const palette = derive(PALETTES.gameboy?.colors ?? [], 'gameboy_');
    expect(Object.keys(palette)).toHaveLength(4);
    expect(palette.gameboy_0?.ramp.base).toBe('#0f380f');
    expect(palette.gameboy_2?.ramp.shadow).toBeDefined();
    expect(palette.gameboy_3?.ramp.highlight).toBeUndefined();
  });

  it('rejects a colour that is not hex', () => {
    expect(() => deriveRamps(['#000000', 'red'])).toThrowError(PxError);
    expect(() => deriveRamps([])).toThrowError(/empty palette/);
  });

  it('reports E_NO_RAMP when ramp_fill needs a role the derivation could not supply', () => {
    const recipe = parseRecipe(
      JSON.stringify({
        version: 1,
        meta: { name: 'derived', width: 8, height: 8, alpha_mode: 'binary' },
        palette: derive(gray),
        anchors: { pivot: [4, 4] },
        layers: [
          {
            id: 'base',
            ops: [
              ['rect', 1, 1, 4, 4, 'c0.base'],
              ['ramp_fill', 3, 'top-left'],
            ],
          },
        ],
      }),
    ).recipe;

    let caught: PxError | undefined;
    try {
      compileRecipe(recipe);
    } catch (error) {
      caught = error as PxError;
    }
    expect(caught?.code).toBe('E_NO_RAMP');
    expect(caught?.hint).toContain('--derive-ramps');
  });
});

describe('luminance and hue', () => {
  it('reports WCAG luminance endpoints', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0, a: 255 })).toBe(0);
    expect(relativeLuminance({ r: 255, g: 255, b: 255, a: 255 })).toBeCloseTo(1, 6);
  });

  it('reads primary hues and wraps the distance', () => {
    expect(hueOf({ r: 255, g: 0, b: 0, a: 255 })).toBeCloseTo(0, 6);
    expect(hueOf({ r: 0, g: 255, b: 0, a: 255 })).toBeCloseTo(120, 6);
    expect(hueOf({ r: 0, g: 0, b: 255, a: 255 })).toBeCloseTo(240, 6);
    expect(hueOf({ r: 128, g: 128, b: 128, a: 255 })).toBe(0);
    expect(circularHueDistance(350, 10)).toBe(20);
    expect(circularHueDistance(10, 350)).toBe(20);
    expect(circularHueDistance(0, 180)).toBe(180);
  });
});

describe('px init palette selection', () => {
  function paletteOf(file: string): Recipe['palette'] {
    return parseRecipe(readFileSync(join(workspace, file), 'utf8')).recipe.palette;
  }

  it('accepts a curated name as a flat family', () => {
    const result = run(['init', '--file', 'gb.px.json', '--palette', 'gameboy']);
    expect(result.code).toBe(0);
    expect(paletteOf('gb.px.json')).toEqual({
      gameboy: { colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'] },
    });
  });

  it('derives ramps from a curated name and documents the rule', () => {
    const result = run([
      'init',
      '--file',
      'derived.px.json',
      '--palette',
      'gameboy',
      '--derive-ramps',
    ]);
    expect(result.code).toBe(0);
    expect(result.envelope.derive_ramps).toBe(true);
    expect(result.envelope.derivation).toBe(DERIVATION_NOTE);
    const palette = paletteOf('derived.px.json');
    expect(Object.keys(palette)).toEqual(['gameboy_0', 'gameboy_1', 'gameboy_2', 'gameboy_3']);
  });

  it('derives ramps from an ad-hoc hex list', () => {
    expect(
      run([
        'init',
        '--file',
        'hex.px.json',
        '--palette',
        '#000000,#808080,#ffffff',
        '--derive-ramps',
      ]).code,
    ).toBe(0);
    expect(Object.keys(paletteOf('hex.px.json'))).toEqual(['c0', 'c1', 'c2']);
  });

  it('rejects an unknown palette name', () => {
    const result = run(['init', '--file', 'bad.px.json', '--palette', 'nope']);
    expect(result.code).toBe(1);
    expect((result.envelope.error as { code: string }).code).toBe('E_USAGE');
    expect((result.envelope.error as { hint: string }).hint).toContain('pico8');
  });
});

describe('E_NO_RAMP names a remedy that exists (F20)', () => {
  interface Failure {
    code: string;
    message: string;
    hint: string;
  }

  /** `#e6f0ff` is the lightest colour, so its derived ramp can have no highlight. */
  const LANTERN = '#14101c,#3a4356,#6b7d99,#a8bcd6,#e6f0ff,#4a2f16,#8a5f22,#c9973c';

  function failure(args: string[]): Failure {
    const result = run(args);
    expect(result.code).toBe(1);
    return result.envelope.error as Failure;
  }

  it('does not offer --derive-ramps when the ramp was derived', () => {
    const error = failure([
      'init',
      '--file',
      'lantern.px.json',
      '--name',
      'lantern',
      '--width',
      '48',
      '--height',
      '48',
      '--palette',
      LANTERN,
      '--derive-ramps',
      '--parts',
      '{"flame":{"material":"c4","gloss":"gem"}}',
    ]);
    expect(error.code).toBe('E_NO_RAMP');
    expect(error.message).toContain('c4');
    expect(error.message).toContain('highlight');
    // A hint that names an impossible remedy costs a call and teaches the wrong
    // model. Assert the absence, not the wording around it.
    expect(error.hint).not.toContain('--derive-ramps');
    expect(error.hint).not.toContain('derive-ramps');
    // The reason that is true: the colour has no neighbour in that direction.
    expect(error.hint).toContain('luminance');
    expect(error.hint).toContain('lighter');
  });

  it('still offers --derive-ramps when the ramp was written by hand', () => {
    const error = failure([
      'init',
      '--file',
      'half.px.json',
      '--palette',
      '{"steel":{"ramp":{"base":"#7d8a9a"}}}',
      '--parts',
      '{"blade":{"material":"steel"}}',
    ]);
    expect(error.code).toBe('E_NO_RAMP');
    expect(error.hint).toContain('--derive-ramps');
  });
});
