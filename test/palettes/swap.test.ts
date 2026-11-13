import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { PxError } from '../../src/core/errors.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import { LATEST_RECIPE_VERSION, type Palette, type Recipe } from '../../src/core/recipe/types.js';
import { applySwaps, resolveSwapMap } from '../../src/palettes/swap.js';
import { renderRecipe } from '../../src/render/render.js';

const STEEL_BASE = '#b13e53';
const GOLD_BASE = '#d9a036';
const GOLD_HIGHLIGHT = '#ffe08a';

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

function errorOf(envelope: Record<string, unknown>): { code?: string; message?: string } {
  return (envelope.error as { code?: string; message?: string } | undefined) ?? {};
}

function sha(text: string | Uint8Array): string {
  return createHash('sha256').update(text).digest('hex');
}

function swapRecipe(): Recipe {
  return {
    // Parts are a 1.1 feature, so the fixture that declares one is 1.1.
    version: LATEST_RECIPE_VERSION,
    meta: { name: 'swap', width: 8, height: 8, alphaMode: 'binary' },
    palette: {
      steel: {
        ramp: {
          outline: '#1a1c2c',
          shadow: '#5d275d',
          base: STEEL_BASE,
          highlight: '#ef7d57',
        },
      },
      gold: {
        ramp: {
          outline: '#3a2a10',
          shadow: '#7a5a20',
          base: GOLD_BASE,
          highlight: GOLD_HIGHLIGHT,
        },
      },
      mono: { colors: ['#000000', '#808080', '#ffffff'] },
      duo: { colors: ['#000000', '#ffffff'] },
      trim: { ramp: { t0: '#ccffcc', t1: '#66ff66', t2: '#00aa00' } },
      bark: { ramp: { t0: '#e8d0b0', t1: '#a07850', t2: '#604020' } },
      deep: {
        ramp: { t0: '#f0e0c0', t1: '#cfb080', t2: '#a07850', t3: '#71502a', t4: '#402810' },
      },
    },
    parts: { body: { material: 'steel', gloss: 'matte', z: 0 } },
    anchors: { pivot: [4, 4] },
    layers: [
      {
        id: 'base',
        ops: [
          { op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'steel.base' },
          { op: 'set_pixels', points: [[0, 0]], color: 'steel.highlight' },
          { op: 'set_pixels', points: [[1, 0]], color: 'steel.outline', part: 'body' },
        ],
      },
    ],
  };
}

function rgbaAt(recipe: Recipe, x: number, y: number): string {
  const result = renderRecipe(recipe);
  const offset = (y * result.width + x) * 4;
  const bytes = Array.from(result.rgba.slice(offset, offset + 4)).map((value) =>
    value.toString(16).padStart(2, '0'),
  );
  return `#${bytes.join('')}`;
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-swap-'));
  writeFileSync(join(workspace, 'swap.px.json'), serializeRecipe(swapRecipe()));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('material swap semantics', () => {
  it('replaces the source family verbatim under its own key', () => {
    const palette = swapRecipe().palette;
    const swapped = applySwaps(palette, ['steel=gold']);
    expect(swapped.steel).toEqual(palette.gold);
    expect(swapped.gold).toEqual(palette.gold);
    expect(swapped.mono).toBe(palette.mono);
  });

  it('resolves direct slot references through the map, not by index', () => {
    const recipe = swapRecipe();
    const swapped: Recipe = { ...recipe, palette: applySwaps(recipe.palette, ['steel=gold']) };
    expect(rgbaAt(swapped, 0, 0)).toBe(`${GOLD_HIGHLIGHT}ff`);
    expect(rgbaAt(swapped, 1, 0)).toBe('#3a2a10ff');
    expect(rgbaAt(swapped, 3, 3)).toBe(`${GOLD_BASE}ff`);
  });

  it('swaps a derived-only family through its tone slots', () => {
    const recipe = swapRecipe();
    const ops = [{ op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'trim.t2', part: 'body' }] as const;
    const paint: Recipe = { ...recipe, layers: [{ id: 'base', ops: [...ops] }] };
    const paintSwapped: Recipe = {
      ...recipe,
      palette: applySwaps(recipe.palette, ['trim=bark']),
      layers: [
        {
          id: 'base',
          ops: [{ op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'trim.t2', part: 'body' }],
        },
      ],
    };
    expect(rgbaAt(paint, 4, 4)).toBe('#00aa00ff');
    expect(rgbaAt(paintSwapped, 4, 4)).toBe('#604020ff');
  });

  it('rejects a target with fewer tones than the source', () => {
    const palette = swapRecipe().palette;
    expect(applySwaps(palette, ['trim=deep']).trim).toEqual(palette.deep);
    let caught: unknown;
    try {
      applySwaps(palette, ['deep=trim']);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PxError);
    expect((caught as PxError).code).toBe('E_SWAP_INCOMPATIBLE');
    expect((caught as PxError).message).toContain('5 tones');
    expect((caught as PxError).message).toContain('3');
  });

  it('is legal onto itself and changes nothing', () => {
    const palette = swapRecipe().palette;
    expect(applySwaps(palette, ['steel=steel'])).toBe(palette);
    expect(resolveSwapMap(palette, ['steel=steel']).size).toBe(0);
    const plain = renderRecipe(swapRecipe());
    const self = renderRecipe({ ...swapRecipe(), palette: applySwaps(palette, ['steel=steel']) });
    expect(sha(self.png)).toBe(sha(plain.png));
  });

  it('collapses chains into one hop', () => {
    const palette: Palette = {
      a: { ramp: { base: '#111111' } },
      b: { ramp: { base: '#222222' } },
      c: { ramp: { base: '#333333' } },
    };
    const swapped = applySwaps(palette, ['a=b', 'b=c']);
    expect(swapped.a).toEqual(palette.c);
    expect(swapped.b).toEqual(palette.c);
  });

  it('rejects a cycle instead of picking a member', () => {
    const palette = swapRecipe().palette;
    let caught: unknown;
    try {
      resolveSwapMap(palette, ['steel=gold', 'gold=steel']);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PxError);
    expect((caught as PxError).code).toBe('E_BAD_PARAM');
  });

  it('names the role a target cannot resolve', () => {
    const palette = swapRecipe().palette;
    let caught: unknown;
    try {
      applySwaps(palette, ['steel=mono']);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PxError);
    expect((caught as PxError).code).toBe('E_SWAP_INCOMPATIBLE');
    expect((caught as PxError).message).toContain('"outline"');
  });

  it('rejects a flat family with too few colours', () => {
    const palette = swapRecipe().palette;
    let caught: unknown;
    try {
      applySwaps(palette, ['mono=duo']);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PxError);
    expect((caught as PxError).code).toBe('E_SWAP_INCOMPATIBLE');
    expect((caught as PxError).message).toContain('3 colours');
    expect((caught as PxError).message).toContain('2');

    const wider = applySwaps(palette, ['duo=mono']);
    expect(wider.duo).toEqual(palette.mono);
  });

  it('rejects an unknown family on either side', () => {
    const palette = swapRecipe().palette;
    for (const entry of ['nope=gold', 'steel=nope']) {
      let caught: unknown;
      try {
        applySwaps(palette, [entry]);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(PxError);
      expect((caught as PxError).code).toBe('E_FAMILY_UNKNOWN');
    }
  });

  it('rejects a malformed entry', () => {
    const palette = swapRecipe().palette;
    for (const entry of ['steel', 'steel=', '=gold']) {
      let caught: unknown;
      try {
        applySwaps(palette, [entry]);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(PxError);
      expect((caught as PxError).code).toBe('E_BAD_PARAM');
    }
  });
});

describe('material swap through the CLI', () => {
  it('changes the render and the manifest while the recipe file stays byte-identical', () => {
    const path = join(workspace, 'swap.px.json');
    const before = readFileSync(path, 'utf8');

    const plain = run(['render', '--file', 'swap.px.json', '--out', 'plain.png', '--export']);
    expect(plain.code).toBe(0);
    const swapped = run([
      'render',
      '--file',
      'swap.px.json',
      '--out',
      'gold.png',
      '--export',
      '--swap',
      'steel=gold',
    ]);
    expect(swapped.code).toBe(0);

    expect(readFileSync(path, 'utf8')).toBe(before);
    expect(swapped.envelope.sha256).not.toBe(plain.envelope.sha256);

    const plainMeta = JSON.parse(readFileSync(join(workspace, 'plain.meta.json'), 'utf8'));
    const swappedMeta = JSON.parse(readFileSync(join(workspace, 'gold.meta.json'), 'utf8'));
    expect(swappedMeta.generic.recipe_hash).toBe(plainMeta.generic.recipe_hash);
    expect(sha(before)).toBe(sha(readFileSync(path, 'utf8')));

    const entry = (
      meta: { generic: { palette: Array<{ key: string; hex: string }> } },
      key: string,
    ) => meta.generic.palette.find((item) => item.key === key)?.hex;
    expect(entry(plainMeta, 'steel.base')).toBe(STEEL_BASE);
    expect(entry(swappedMeta, 'steel.base')).toBe(GOLD_BASE);
    expect(entry(swappedMeta, 'steel.outline')).toBe('#3a2a10');
  });

  it('swaps the debug preview too', () => {
    const plain = run(['render', '--file', 'swap.px.json', '--out', 'p.png', '--debug']);
    const swapped = run([
      'render',
      '--file',
      'swap.px.json',
      '--out',
      'g.png',
      '--debug',
      '--swap',
      'steel=gold',
    ]);
    expect(plain.code).toBe(0);
    expect(swapped.code).toBe(0);
    const plainDebug = sha(readFileSync(join(workspace, 'p.debug.png')));
    const swappedDebug = sha(readFileSync(join(workspace, 'g.debug.png')));
    expect(swappedDebug).not.toBe(plainDebug);
  });

  it('reports E_SWAP_INCOMPATIBLE from the render command', () => {
    const result = run([
      'render',
      '--file',
      'swap.px.json',
      '--out',
      'x.png',
      '--swap',
      'steel=mono',
    ]);
    expect(result.code).toBe(1);
    expect(errorOf(result.envelope).code).toBe('E_SWAP_INCOMPATIBLE');
    expect(errorOf(result.envelope).message).toContain('"outline"');
  });

  it('reports E_BAD_PARAM for a malformed entry and leaves no PNG', () => {
    const result = run(['render', '--file', 'swap.px.json', '--out', 'x.png', '--swap', 'steel']);
    expect(result.code).toBe(1);
    expect(errorOf(result.envelope).code).toBe('E_BAD_PARAM');
  });
});
