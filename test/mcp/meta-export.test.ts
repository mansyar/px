import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { buildMetadata } from '../../src/meta/index.js';

interface Envelope {
  ok: boolean;
  metadata?: { out: string; bytes: number; sha256: string; recipe_hash: string };
  sheet?: SheetBlock;
  sha256?: string;
  [key: string]: unknown;
}

interface SheetBlock {
  out: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  metadata: { out: string; bytes: number; sha256: string; recipe_hash: string };
}

interface MetaJson {
  v: number;
  godot: { texture_path: string; anchors: unknown; offset: unknown };
  generic: {
    canvas: unknown;
    recipe_hash: string;
    palette: unknown;
    sheet?: Array<Record<string, unknown>>;
  };
}

let workspace = '';

function run(args: string[]): { code: number; envelope: Envelope } {
  let raw = '';
  const code = runCli(args, {
    cwd: workspace,
    stdout: (text) => {
      raw += text;
    },
    stderr: () => undefined,
  });
  return { code, envelope: JSON.parse(raw) as Envelope };
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-meta-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('render --export', () => {
  it('writes <name>.meta.json beside the PNG without changing the rendered bytes', () => {
    const fixture = readFileSync(
      join(process.cwd(), 'test', 'goldens', 'fixtures', 'hero.px.json'),
      'utf8',
    );
    const expectedHash = readFileSync(
      join(process.cwd(), 'test', 'goldens', 'fixtures', 'hero.sha256'),
      'utf8',
    ).trim();
    writeFileSync(join(workspace, 'hero.px.json'), fixture, 'utf8');

    const result = run(['render', '--file', 'hero.px.json', '--out', 'out/hero.png', '--export']);

    expect(result.code).toBe(0);
    expect(result.envelope.sha256).toBe(expectedHash);
    expect(result.envelope.metadata?.out).toBe('out/hero.meta.json');
    expect(result.envelope.metadata?.bytes).toBeGreaterThan(0);
    expect(result.envelope.metadata?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.envelope.metadata?.recipe_hash).toMatch(/^sha256:[0-9a-f]{64}$/);

    const text = readFileSync(join(workspace, 'out', 'hero.meta.json'), 'utf8');
    const parsed = parseRecipe(fixture).recipe;
    expect(JSON.parse(text)).toEqual(buildMetadata(parsed, compileRecipe(parsed), 'out/hero.png'));
  });

  it('writes no metadata unless asked', () => {
    writeFileSync(
      join(workspace, 'plain.px.json'),
      JSON.stringify({
        version: 1,
        meta: { name: 'plain', width: 8, height: 8, alpha_mode: 'binary' },
        palette: { main: { colors: ['#000000'] } },
        anchors: { pivot: [4, 4] },
        layers: [{ id: 'base', ops: [['rect', 1, 1, 4, 4, 'main.0']] }],
      }),
      'utf8',
    );

    const plain = run(['render', '--file', 'plain.px.json', '--out', 'plain.png']);
    expect(plain.code).toBe(0);
    expect(plain.envelope.metadata).toBeUndefined();
  });
});

describe('render --export on a framed recipe', () => {
  const fixtures = join(process.cwd(), 'test', 'goldens', 'fixtures');
  const framed = readFileSync(join(fixtures, 'anim-duo.px.json'), 'utf8');
  const frameHash = readFileSync(join(fixtures, 'anim-duo.sha256'), 'utf8').trim();
  const sheetHash = readFileSync(join(fixtures, 'anim-duo.sheet.sha256'), 'utf8').trim();

  it('adds the sheet PNG and additive sheet meta beside the unchanged frame-0 pair', () => {
    writeFileSync(join(workspace, 'anim-duo.px.json'), framed, 'utf8');

    const result = run([
      'render',
      '--file',
      'anim-duo.px.json',
      '--out',
      'out/anim-duo.png',
      '--export',
    ]);
    expect(result.code).toBe(0);
    expect(result.envelope.sha256).toBe(frameHash);

    const sheet = result.envelope.sheet;
    expect(sheet).toBeDefined();
    if (sheet === undefined) return;
    expect(sheet.out).toBe('out/anim-duo.sheet.png');
    expect(sheet.sha256).toBe(sheetHash);
    expect([sheet.width, sheet.height]).toEqual([32, 16]);
    expect(sheet.metadata.out).toBe('out/anim-duo.sheet.meta.json');
    expect(sheet.metadata.sha256).toMatch(/^[0-9a-f]{64}$/);

    for (const file of [
      'out/anim-duo.png',
      'out/anim-duo.meta.json',
      'out/anim-duo.sheet.png',
      'out/anim-duo.sheet.meta.json',
    ]) {
      expect(existsSync(join(workspace, file))).toBe(true);
    }

    const normal = JSON.parse(
      readFileSync(join(workspace, 'out', 'anim-duo.meta.json'), 'utf8'),
    ) as MetaJson;
    const exported = JSON.parse(
      readFileSync(join(workspace, 'out', 'anim-duo.sheet.meta.json'), 'utf8'),
    ) as MetaJson;

    // The frame-0 meta is unchanged: no additive key, and equal to the legacy
    // buildMetadata projection for the same recipe.
    expect(normal.generic.sheet).toBeUndefined();
    const parsed = parseRecipe(framed).recipe;
    expect(normal).toEqual(buildMetadata(parsed, compileRecipe(parsed), 'out/anim-duo.png'));

    // The sheet meta is additive: one ordered entry per frame; every existing
    // field keeps the frame-0 value.
    expect(exported.godot.texture_path).toBe('anim-duo.sheet.png');
    expect(exported.v).toBe(normal.v);
    expect(exported.godot.anchors).toEqual(normal.godot.anchors);
    expect(exported.godot.offset).toEqual(normal.godot.offset);
    expect(exported.generic.canvas).toEqual(normal.generic.canvas);
    expect(exported.generic.palette).toEqual(normal.generic.palette);
    expect(exported.generic.recipe_hash).toBe(normal.generic.recipe_hash);
    expect(exported.generic.sheet).toHaveLength(2);
    const entries = exported.generic.sheet ?? [];
    expect(entries[0]).toMatchObject({ index: 0, x: 0, y: 0, width: 16, height: 16 });
    expect(entries[0]?.id).toBeUndefined();
    expect(entries[0]?.duration).toBeUndefined();
    expect(entries[1]).toMatchObject({
      index: 1,
      id: 'shift',
      x: 16,
      y: 0,
      width: 16,
      height: 16,
      duration: 120,
    });
  });

  it('writes no sheet artifacts without --export', () => {
    writeFileSync(join(workspace, 'anim-duo.px.json'), framed, 'utf8');

    const result = run(['render', '--file', 'anim-duo.px.json', '--out', 'anim-duo.png']);
    expect(result.code).toBe(0);
    expect(result.envelope.sheet).toBeUndefined();
    expect(existsSync(join(workspace, 'anim-duo.sheet.png'))).toBe(false);
    expect(existsSync(join(workspace, 'anim-duo.sheet.meta.json'))).toBe(false);
  });

  it('writes no sheet artifacts for a 1.4 recipe with no frames', () => {
    const single = JSON.parse(framed) as Record<string, unknown>;
    delete single.frames;
    writeFileSync(join(workspace, 'single.px.json'), JSON.stringify(single), 'utf8');

    const result = run(['render', '--file', 'single.px.json', '--out', 'single.png', '--export']);
    expect(result.code).toBe(0);
    expect(result.envelope.sheet).toBeUndefined();
    expect(existsSync(join(workspace, 'single.sheet.png'))).toBe(false);
    expect(existsSync(join(workspace, 'single.sheet.meta.json'))).toBe(false);
    const meta = JSON.parse(readFileSync(join(workspace, 'single.meta.json'), 'utf8')) as MetaJson;
    expect(meta.generic.sheet).toBeUndefined();
  });
});
