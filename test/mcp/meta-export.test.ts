import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { buildMetadata } from '../../src/meta/index.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

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

interface TimelineFrameJson {
  index: number;
  id?: string;
  duration_ms?: number;
  start_ms: number;
}

interface TimelineJson {
  frames: TimelineFrameJson[];
  total_ms: number;
}

interface MetaJson {
  v: number;
  name: string;
  godot: { texture_path: string; anchors: unknown; offset: unknown };
  generic: {
    canvas: unknown;
    recipe_hash: string;
    palette: unknown;
    sheet?: Array<Record<string, unknown>>;
    timeline?: TimelineJson;
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
    expect(text).not.toContain('timeline');
    expect(createHash('sha256').update(text).digest('hex')).toBe(
      '5420fd7aa2b508781be8d188ced41d5dd5aa90adb4a5788f8a36e0ff7894c068',
    );
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
  beforeEach(() => {
    // The restored design.style "@project" resolves px.style.json beside the
    // recipe, so a temp workspace rendering the fixture needs that style too.
    copyFileSync(join(REPO_ROOT, 'px.style.json'), join(workspace, 'px.style.json'));
  });

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
    // AC-5 / FR-3 / FR-4: the framed normal meta gains an additive timeline.
    const timeline = normal.generic.timeline;
    expect(timeline).toBeDefined();
    if (timeline === undefined) return;
    expect(timeline.frames).toHaveLength(2);
    expect(timeline.frames[0]).toEqual({ index: 0, start_ms: 0 });
    expect(timeline.frames[1]).toEqual({
      index: 1,
      id: 'shift',
      duration_ms: 120,
      start_ms: 0,
    });
    expect(timeline.total_ms).toBe(120);

    // AC-6: removing the new key yields the exact pre-timeline projection, so
    // every existing field and the Godot block are unchanged. A strip-to-frames
    // variant checks the frame-independent fields too; recipe_hash legitimately
    // covers the frames and is checked against the framed recipe separately.
    const withoutTimeline = { ...normal.generic };
    delete withoutTimeline.timeline;
    const parsed = parseRecipe(framed).recipe;
    const canonical = buildMetadata(parsed, compileRecipe(parsed), 'out/anim-duo.png');
    const canonicalLegacy = { ...canonical.generic };
    delete canonicalLegacy.timeline;
    expect(withoutTimeline).toEqual(canonicalLegacy);
    expect(normal.godot).toEqual(canonical.godot);
    expect(normal.v).toBe(canonical.v);
    expect(normal.name).toBe(canonical.name);

    const single = JSON.parse(framed) as Record<string, unknown>;
    delete single.frames;
    const legacy = parseRecipe(JSON.stringify(single)).recipe;
    const legacyMeta = buildMetadata(legacy, compileRecipe(legacy), 'out/anim-duo.png');
    const { recipe_hash: legacyHash, ...legacyFields } = legacyMeta.generic;
    const { recipe_hash: framedHash, ...framedFields } = withoutTimeline;
    expect(framedFields).toEqual(legacyFields);
    expect(framedHash).not.toBe(legacyHash);

    // The frame-0 meta is unchanged: no additive sheet key, and equal to the
    // canonical buildMetadata projection for the same framed recipe.
    expect(normal.generic.sheet).toBeUndefined();
    expect(normal).toEqual(canonical);

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
    expect(meta.generic.timeline).toBeUndefined();
  });
});

/**
 * FR-4 / AC-5 edge cases: undeclared durations contribute 0 to cumulative time
 * and carry no duration_ms; a fully undurated recipe still emits a zeroed
 * timeline. FR-5 / AC-7: a framed export is a deterministic double render.
 */
describe('timeline contract and framed-export determinism', () => {
  const fixtures = join(process.cwd(), 'test', 'goldens', 'fixtures');
  const framed = readFileSync(join(fixtures, 'anim-duo.px.json'), 'utf8');

  beforeEach(() => {
    copyFileSync(join(REPO_ROOT, 'px.style.json'), join(workspace, 'px.style.json'));
  });

  function unduratedRecipe(): string {
    return JSON.stringify({
      version: '1.4',
      meta: { name: 'undurated', width: 8, height: 8, alpha_mode: 'binary' },
      palette: { main: { colors: ['#000000'] } },
      anchors: {},
      layers: [{ id: 'base', ops: [['rect', 1, 1, 2, 2, 'main.0']] }],
      frames: [
        { id: 'a', layers: [{ id: 'base', ops: [] }], duration: 100 },
        { id: 'b', layers: [{ id: 'base', ops: [] }] },
        { id: 'c', layers: [{ id: 'base', ops: [] }], duration: 50 },
      ],
    });
  }

  it('omits duration_ms for undeclared frames and sums only declared durations', () => {
    writeFileSync(join(workspace, 'undurated.px.json'), unduratedRecipe(), 'utf8');

    const result = run([
      'render',
      '--file',
      'undurated.px.json',
      '--out',
      'undurated.png',
      '--export',
    ]);
    expect(result.code).toBe(0);
    const meta = JSON.parse(
      readFileSync(join(workspace, 'undurated.meta.json'), 'utf8'),
    ) as MetaJson;
    expect(meta.generic.timeline).toEqual({
      frames: [
        { index: 0, start_ms: 0 },
        { index: 1, id: 'a', duration_ms: 100, start_ms: 0 },
        { index: 2, id: 'b', start_ms: 100 },
        { index: 3, id: 'c', duration_ms: 50, start_ms: 100 },
      ],
      total_ms: 150,
    });
  });

  it('emits a zeroed timeline for a fully undurated framed recipe', () => {
    const recipe = JSON.parse(unduratedRecipe()) as Record<string, unknown>;
    const frames = recipe.frames as Array<Record<string, unknown>>;
    for (const frame of frames) {
      delete frame.duration;
    }
    writeFileSync(join(workspace, 'zerod.px.json'), JSON.stringify(recipe), 'utf8');

    const result = run(['render', '--file', 'zerod.px.json', '--out', 'zerod.png', '--export']);
    expect(result.code).toBe(0);
    const meta = JSON.parse(readFileSync(join(workspace, 'zerod.meta.json'), 'utf8')) as MetaJson;
    expect(meta.generic.timeline).toEqual({
      frames: [
        { index: 0, start_ms: 0 },
        { index: 1, id: 'a', start_ms: 0 },
        { index: 2, id: 'b', start_ms: 0 },
        { index: 3, id: 'c', start_ms: 0 },
      ],
      total_ms: 0,
    });
  });

  it('renders a framed export twice to byte-identical PNG and metadata bytes', () => {
    writeFileSync(join(workspace, 'anim-duo.px.json'), framed, 'utf8');
    const args = ['render', '--file', 'anim-duo.px.json', '--out', 'out/anim-duo.png', '--export'];

    const first = run(args);
    expect(first.code).toBe(0);
    const firstFiles = [
      'out/anim-duo.png',
      'out/anim-duo.meta.json',
      'out/anim-duo.sheet.png',
      'out/anim-duo.sheet.meta.json',
    ].map((path) => readFileSync(join(workspace, path)));
    const firstEnvelope = JSON.stringify(first.envelope);

    const second = run(args);
    expect(second.code).toBe(0);
    const secondFiles = [
      'out/anim-duo.png',
      'out/anim-duo.meta.json',
      'out/anim-duo.sheet.png',
      'out/anim-duo.sheet.meta.json',
    ].map((path) => readFileSync(join(workspace, path)));

    expect(secondFiles).toEqual(firstFiles);
    expect(JSON.stringify(second.envelope)).toBe(firstEnvelope);
    expect((second.envelope.sheet as { sha256: string }).sha256).toBe(
      (first.envelope.sheet as { sha256: string }).sha256,
    );
  });
});
