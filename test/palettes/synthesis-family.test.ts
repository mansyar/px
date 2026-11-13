import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { PxError } from '../../src/core/errors.js';
import { buildSlotRoles, buildSlotTable, parseHex } from '../../src/core/palette.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import { RECIPE_VERSION, type Recipe } from '../../src/core/recipe/types.js';
import { relativeLuminance } from '../../src/palettes/luminance.js';

const HEX = /^#[0-9a-f]{6}$/;
const TONES = ['t0', 't1', 't2', 't3', 't4'] as const;

let workspace = '';

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

function read(name: string): string {
  return readFileSync(join(workspace, name), 'utf8');
}

function errorCode(envelope: Record<string, unknown>): unknown {
  return (envelope.error as { code?: string } | undefined)?.code;
}

function rampOf(recipe: Recipe, name: string): Record<string, string> {
  const family = recipe.palette[name];
  if (family === undefined || !('ramp' in family)) {
    throw new Error(`expected a ramp family named ${name}`);
  }
  return family.ramp as Record<string, string>;
}

function luminanceOfHex(hex: string): number {
  const rgba = parseHex(hex);
  if (rgba === null) {
    throw new Error(`not a hex colour: ${hex}`);
  }
  return relativeLuminance(rgba);
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-synthesis-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('synthesised family canonicalisation', () => {
  it('writes tones t0 … t(n-1) lightest first and no synthesis metadata', () => {
    expect(run(['init', '--file', 'leaf.px.json', '--synthesize', 'leaf=#4a8f3c:5']).code).toBe(0);
    const text = read('leaf.px.json');
    const parsed = parseRecipe(text);
    const ramp = rampOf(parsed.recipe, 'leaf');

    expect(Object.keys(ramp)).toEqual([...TONES]);
    const tones = TONES.map((tone) => ramp[tone] ?? '');
    for (const tone of tones) {
      expect(tone).toMatch(HEX);
    }
    for (let index = 1; index < tones.length; index += 1) {
      expect(luminanceOfHex(tones[index] ?? '')).toBeLessThan(
        luminanceOfHex(tones[index - 1] ?? ''),
      );
    }

    // Nothing about the synthesis survives the write: no op, formula or field.
    expect(text).not.toContain('synthesize');
    expect(text).not.toContain('steps');
    expect(serializeRecipe(parsed.recipe)).toBe(text);
  });

  it('derives highlight/base/shadow from the tones in slot order', () => {
    expect(run(['init', '--file', 'leaf.px.json', '--synthesize', 'leaf=#4a8f3c:5']).code).toBe(0);
    const { recipe } = parseRecipe(read('leaf.px.json'));
    const slots = buildSlotTable(recipe.palette);
    const roles = buildSlotRoles(slots);
    const familyIndex = slots.familyNames.indexOf('leaf');
    const leaf = roles.roleSlots[familyIndex] ?? {};

    expect(leaf.highlight).toBe(slots.resolve('leaf.t0'));
    expect(leaf.base).toBe(slots.resolve('leaf.t2'));
    expect(leaf.shadow).toBe(slots.resolve('leaf.t4'));
    expect(leaf.outline).toBeUndefined();
  });

  it('lets an explicit role key win over a derived one', () => {
    const recipe: Recipe = {
      version: RECIPE_VERSION,
      meta: { name: 'explicit', width: 8, height: 8, alphaMode: 'binary' },
      palette: {
        mixed: {
          ramp: { base: '#111111', t0: '#ffffff', t1: '#888888', t2: '#000000' },
        },
      },
      anchors: { pivot: [4, 4] },
      layers: [{ id: 'base', ops: [] }],
    };
    const parsed = parseRecipe(serializeRecipe(recipe));
    const slots = buildSlotTable(parsed.recipe.palette);
    const roles = buildSlotRoles(slots);
    const mixed = roles.roleSlots[slots.familyNames.indexOf('mixed')] ?? {};

    expect(mixed.base).toBe(slots.resolve('mixed.base'));
    expect(mixed.highlight).toBe(slots.resolve('mixed.t0'));
    expect(mixed.shadow).toBe(slots.resolve('mixed.t2'));
  });

  it('gives a three-tone family exactly the three shading roles', () => {
    expect(run(['init', '--file', 'triad.px.json', '--synthesize', 'triad=#b13e53:3']).code).toBe(
      0,
    );
    const { recipe } = parseRecipe(read('triad.px.json'));
    const slots = buildSlotTable(recipe.palette);
    const roles = buildSlotRoles(slots);
    const triad = roles.roleSlots[slots.familyNames.indexOf('triad')] ?? {};

    expect(Object.keys(rampOf(recipe, 'triad'))).toEqual(['t0', 't1', 't2']);
    expect(triad.highlight).toBe(slots.resolve('triad.t0'));
    expect(triad.base).toBe(slots.resolve('triad.t1'));
    expect(triad.shadow).toBe(slots.resolve('triad.t2'));
    expect(triad.outline).toBeUndefined();

    // The derived roles are real: ramp_fill needs base and shadow, not names.
    const drawn = run([
      'draw',
      '--file',
      'triad.px.json',
      '--ops',
      JSON.stringify([
        { op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'triad.t1' },
        { op: 'ramp_fill', bands: 3, light_dir: 'top-left' },
      ]),
    ]);
    expect(drawn.code, JSON.stringify(drawn.envelope)).toBe(0);
    expect(errorCode(drawn.envelope)).toBeUndefined();
  });

  it('rewrites the same bytes on a forced second synthesis', () => {
    const first = run(['init', '--file', 'leaf.px.json', '--synthesize', 'leaf=#4a8f3c:5']);
    expect(first.code).toBe(0);
    const before = read('leaf.px.json');

    const repeated = run([
      'init',
      '--file',
      'leaf.px.json',
      '--force',
      '--synthesize',
      'leaf=#4a8f3c:5',
    ]);
    expect(repeated.code).toBe(0);
    expect(read('leaf.px.json')).toBe(before);

    const rerun = run([
      'synthesize',
      '--file',
      'leaf.px.json',
      '--family',
      'leaf',
      '--from',
      '#4a8f3c',
      '--steps',
      '5',
      '--force',
    ]);
    expect(rerun.code).toBe(0);
    expect(read('leaf.px.json')).toBe(before);
  });

  it('refuses an existing family name without --force', () => {
    expect(run(['init', '--file', 'leaf.px.json']).code).toBe(0);
    const refused = run([
      'synthesize',
      '--file',
      'leaf.px.json',
      '--family',
      'steel',
      '--from',
      '#4a8f3c',
      '--steps',
      '4',
    ]);
    expect(refused.code).toBe(1);
    expect(errorCode(refused.envelope)).toBe('E_FAMILY_EXISTS');

    const forced = run([
      'synthesize',
      '--file',
      'leaf.px.json',
      '--family',
      'steel',
      '--from',
      '#4a8f3c',
      '--steps',
      '4',
      '--force',
    ]);
    expect(forced.code).toBe(0);
    const { recipe } = parseRecipe(read('leaf.px.json'));
    expect(Object.keys(rampOf(recipe, 'steel'))).toEqual(['t0', 't1', 't2', 't3']);
  });

  it('rejects a family the starting palette already declares', () => {
    const refused = run(['init', '--file', 'dupe.px.json', '--synthesize', 'steel=#b13e53:3']);
    expect(refused.code).toBe(1);
    expect(errorCode(refused.envelope)).toBe('E_FAMILY_EXISTS');
  });

  it('reports the written slots and leaves other families alone', () => {
    expect(run(['init', '--file', 'two.px.json', '--synthesize', 'leaf=#4a8f3c:4']).code).toBe(0);
    const payload = run([
      'synthesize',
      '--file',
      'two.px.json',
      '--family',
      'bark',
      '--from',
      '#6b4c2a',
      '--steps',
      '3',
    ]);
    expect(payload.code).toBe(0);
    expect(payload.envelope.slots).toEqual(['bark.t0', 'bark.t1', 'bark.t2']);

    const { recipe } = parseRecipe(read('two.px.json'));
    expect(recipe.palette.steel).toBeDefined();
    expect(recipe.palette.leaf).toBeDefined();
    expect(recipe.palette.bark).toBeDefined();
  });

  it('rejects a ramp whose tones have a gap', () => {
    const text = JSON.stringify(
      {
        version: '1.1',
        meta: { name: 'gap', width: 8, height: 8, alpha_mode: 'binary' },
        palette: { gap: { ramp: { t0: '#ffffff', t2: '#000000' } } },
        anchors: {},
        layers: [{ id: 'base', ops: [] }],
      },
      null,
      2,
    );
    let caught: unknown;
    try {
      parseRecipe(text);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PxError);
    expect((caught as PxError).code).toBe('E_BAD_PALETTE');
    expect((caught as PxError).message).toContain('gap');
  });
});
