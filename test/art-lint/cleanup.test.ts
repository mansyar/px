/**
 * Cleanup passes: `seal`, `strays`, `deband`.
 *
 * Each pass reports exactly what it changed, and a pass that finds nothing to do
 * raises `W_CLEANUP_NOOP` instead of pretending it worked.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { compileSprite } from './helpers.js';

interface Envelope {
  v?: number;
  ok?: boolean;
  code?: string;
  error?: { code: string; message: string; hint: string };
  [key: string]: unknown;
}

interface Run {
  code: number;
  envelope: Envelope | null;
  raw: string;
  stderr: string;
}

const STEEL = { shadow: '#303030', base: '#808080', highlight: '#c0c0c0' };
const PALETTE = { steel: { ramp: { ...STEEL } } };

function compile(ops: unknown[], options: { width?: number; height?: number } = {}) {
  return compileSprite(ops, {
    width: options.width ?? 16,
    height: options.height ?? 16,
    palette: PALETTE,
  });
}

function slotOf(compiled: ReturnType<typeof compile>, name: string): number {
  return compiled.slots.resolve(name) ?? -1;
}

function at(compiled: ReturnType<typeof compile>, x: number, y: number): number {
  return compiled.flattened[y * compiled.width + x] ?? -2;
}

const dirs: string[] = [];

afterAll(() => {
  for (const dir of dirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function workspace(recipe: unknown): { cwd: string; file: string } {
  const cwd = mkdtempSync(join(tmpdir(), 'px-cleanup-'));
  dirs.push(cwd);
  const file = 'clean.px.json';
  writeFileSync(join(cwd, file), `${JSON.stringify(recipe, null, 2)}\n`, 'utf8');
  return { cwd, file };
}

function recipeWith(ops: unknown[], extra: Record<string, unknown> = {}): unknown {
  return {
    version: '1.1',
    meta: { name: 'clean', width: 8, height: 8, alpha_mode: 'binary' },
    palette: { main: { colors: ['#000000', '#ffffff'] } },
    anchors: {},
    layers: [{ id: 'base', ops }],
    ...extra,
  };
}

function run(cwd: string, command: string, extra: string[] = []): Run {
  const out: string[] = [];
  const err: string[] = [];
  const code = runCli([command, '--file', 'clean.px.json', ...extra], {
    cwd,
    stdout: (text) => out.push(text),
    stderr: (text) => err.push(text),
  });
  const raw = out.join('');
  return { code, envelope: raw === '' ? null : JSON.parse(raw), raw, stderr: err.join('') };
}

describe('seal', () => {
  it('closes a one-pixel hole and reports the coordinate', () => {
    const compiled = compile([
      { op: 'rect', x: 2, y: 2, w: 6, h: 6, color: 'steel.base' },
      { op: 'set_pixels', points: [[4, 4]], color: null },
      { op: 'seal' },
    ]);
    expect(compiled.cleanup).toEqual([{ op: 'seal', changed: 1, coords: [[4, 4]] }]);
    expect(at(compiled, 4, 4)).toBe(slotOf(compiled, 'steel.base'));
  });

  it('seals a two-by-two hole with the surrounding tone', () => {
    const compiled = compile([
      { op: 'rect', x: 2, y: 2, w: 6, h: 6, color: 'steel.shadow' },
      { op: 'rect', x: 4, y: 4, w: 2, h: 2, color: null },
      { op: 'seal' },
    ]);
    expect(compiled.cleanup?.[0]?.changed).toBe(4);
    expect(at(compiled, 4, 4)).toBe(slotOf(compiled, 'steel.shadow'));
  });

  it('leaves a three-pixel hole alone and says it changed nothing', () => {
    const compiled = compile([
      { op: 'rect', x: 2, y: 2, w: 6, h: 6, color: 'steel.base' },
      { op: 'rect', x: 4, y: 4, w: 3, h: 3, color: null },
      { op: 'seal' },
    ]);
    expect(compiled.cleanup).toEqual([{ op: 'seal', changed: 0, coords: [] }]);
    expect(compiled.warnings.map((warning) => warning.code)).toContain('W_CLEANUP_NOOP');
  });

  it('does not seal a notch that opens onto the border', () => {
    const compiled = compile([
      { op: 'rect', x: 2, y: 2, w: 4, h: 4, color: 'steel.base' },
      { op: 'set_pixels', points: [[2, 2]], color: null },
      { op: 'seal' },
    ]);
    expect(compiled.cleanup?.[0]?.changed).toBe(0);
  });
});

describe('strays', () => {
  it('keeps a lone pixel when the profile minimum is one', () => {
    const compiled = compile([
      { op: 'set_pixels', points: [[3, 3]], color: 'steel.base' },
      { op: 'strays' },
    ]);
    expect(compiled.cleanup).toEqual([{ op: 'strays', changed: 0, coords: [] }]);
    expect(compiled.warnings.map((warning) => warning.code)).toContain('W_CLEANUP_NOOP');
  });

  it('erases components under the large-profile minimum and keeps the rest', () => {
    const compiled = compile(
      [
        { op: 'set_pixels', points: [[10, 10]], color: 'steel.base' },
        {
          op: 'set_pixels',
          points: [
            [20, 20],
            [21, 20],
          ],
          color: 'steel.base',
        },
        {
          op: 'set_pixels',
          points: [
            [30, 30],
            [31, 30],
            [30, 31],
          ],
          color: 'steel.base',
        },
        { op: 'strays' },
      ],
      { width: 160, height: 160 },
    );
    expect(compiled.cleanup?.[0]?.changed).toBe(3);
    expect(at(compiled, 10, 10)).toBe(-1);
    expect(at(compiled, 30, 30)).toBe(slotOf(compiled, 'steel.base'));
  });

  it('reads target_layer instead of its own layer', () => {
    const text = JSON.stringify({
      version: '1.1',
      meta: { name: 'clean', width: 160, height: 160, alpha_mode: 'binary' },
      palette: { steel: { ramp: { ...STEEL } } },
      anchors: {},
      layers: [
        {
          id: 'base',
          ops: [
            {
              op: 'set_pixels',
              points: [
                [30, 30],
                [31, 30],
                [30, 31],
              ],
              color: 'steel.base',
            },
          ],
        },
        {
          id: 'top',
          ops: [
            { op: 'set_pixels', points: [[7, 7]], color: 'steel.highlight' },
            { op: 'strays', target_layer: 'base' },
          ],
        },
      ],
    });
    const compiled = compileRecipe(parseRecipe(text).recipe);
    // The base holds only a three-pixel cluster, so there is nothing to erase —
    // and the lone pixel in `top` survives because it was never the source.
    expect(compiled.cleanup).toEqual([{ op: 'strays', changed: 0, coords: [] }]);
    const top = compiled.layers[1]?.canvas;
    expect(top?.get(7, 7)).toBe(compiled.slots.resolve('steel.highlight'));
  });
});

describe('deband', () => {
  it('steps the middle run of a band one tone darker', () => {
    const compiled = compile([
      { op: 'rect', x: 0, y: 2, w: 10, h: 6, color: 'steel.base' },
      { op: 'deband' },
    ]);
    const report = compiled.cleanup?.[0];
    expect(report?.op).toBe('deband');
    expect(report?.changed).toBe(10);
    expect(report?.coords).toEqual([
      [0, 4],
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
      [5, 4],
      [6, 4],
      [7, 4],
      [8, 4],
      [9, 4],
    ]);
    expect(at(compiled, 0, 4)).toBe(slotOf(compiled, 'steel.shadow'));
    expect(at(compiled, 0, 3)).toBe(slotOf(compiled, 'steel.base'));
  });

  it('leaves the darkest tone alone and reports a no-op', () => {
    const compiled = compile([
      { op: 'rect', x: 0, y: 2, w: 10, h: 6, color: 'steel.shadow' },
      { op: 'deband' },
    ]);
    expect(compiled.cleanup).toEqual([{ op: 'deband', changed: 0, coords: [] }]);
    expect(compiled.warnings.map((warning) => warning.code)).toContain('W_CLEANUP_NOOP');
  });

  it('steps a tone family toward the next darker tone', () => {
    const compiled = compileSprite(
      [{ op: 'rect', x: 0, y: 2, w: 10, h: 6, color: 'ramp.t0' }, { op: 'deband' }],
      {
        width: 16,
        height: 16,
        palette: { ramp: { ramp: { t0: '#e0e0e0', t1: '#a0a0a0', t2: '#606060', t3: '#202020' } } },
      },
    );
    expect(at(compiled, 0, 4)).toBe(slotOf(compiled, 'ramp.t1'));
  });

  it('caps the reported coordinates but keeps the count exact', () => {
    const compiled = compile(
      [{ op: 'rect', x: 0, y: 0, w: 100, h: 8, color: 'steel.base' }, { op: 'deband' }],
      { width: 160, height: 160 },
    );
    expect(compiled.cleanup?.[0]?.changed).toBe(100);
    expect(compiled.cleanup?.[0]?.coords.length).toBe(50);
  });
});

describe('cleanup reporting', () => {
  it('carries the report on validate and keeps it off recipes without a pass', () => {
    const withPass = workspace(
      recipeWith([
        { op: 'rect', x: 1, y: 1, w: 5, h: 5, color: 'main.0' },
        { op: 'set_pixels', points: [[3, 3]], color: null },
        { op: 'seal' },
      ]),
    );
    const sealed = run(withPass.cwd, 'validate');
    expect(sealed.code).toBe(0);
    expect(sealed.envelope).toMatchObject({
      cleanup: [{ op: 'seal', changed: 1, coords: [[3, 3]] }],
    });

    const plain = workspace(recipeWith([{ op: 'rect', x: 1, y: 1, w: 5, h: 5, color: 'main.0' }]));
    const untouched = run(plain.cwd, 'validate');
    expect(untouched.code).toBe(0);
    expect(Object.hasOwn(untouched.envelope ?? {}, 'cleanup')).toBe(false);
  });

  it('reports a cleanup pass added by draw, including its no-op warning', () => {
    const { cwd, file } = workspace(recipeWith([]));
    const drawn = run(cwd, 'draw', ['--ops', '[{"op":"strays"}]']);
    expect(drawn.code).toBe(0);
    expect(drawn.envelope).toMatchObject({
      cleanup: [{ op: 'strays', changed: 0, coords: [] }],
    });
    const warnings = (drawn.envelope?.warnings ?? []) as Array<{ code: string }>;
    expect(warnings.map((warning) => warning.code)).toContain('W_CLEANUP_NOOP');
    expect(readFileSync(join(cwd, file), 'utf8')).toContain('"strays"');
  });

  it('rejects keys a cleanup pass does not take', () => {
    const unknown = workspace(
      recipeWith([
        { op: 'rect', x: 1, y: 1, w: 5, h: 5, color: 'main.0' },
        { op: 'seal', foo: 1 },
      ]),
    );
    const first = run(unknown.cwd, 'validate');
    expect(first.code).toBe(1);
    expect(first.envelope?.error?.code).toBe('E_BAD_PARAM');

    const tagged = workspace(
      recipeWith([
        { op: 'rect', x: 1, y: 1, w: 5, h: 5, color: 'main.0' },
        { op: 'seal', part: 'a' },
      ]),
    );
    const second = run(tagged.cwd, 'validate');
    expect(second.code).toBe(1);
    expect(second.envelope?.error?.code).toBe('E_BAD_PARAM');
  });
});
