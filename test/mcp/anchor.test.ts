import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';

interface Envelope {
  ok: boolean;
  command: string;
  name?: string;
  anchor?: [number, number];
  anchors?: Record<string, [number, number]>;
  warnings?: Array<{ code: string }>;
  error?: { code: string };
  commands?: string[];
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

function writeRecipe(): void {
  writeFileSync(
    join(workspace, 'hero.px.json'),
    JSON.stringify({
      version: 1,
      meta: { name: 'hero', width: 16, height: 16, alpha_mode: 'binary' },
      palette: { steel: { ramp: { base: '#8b9bb4' } } },
      anchors: { pivot: [8, 8] },
      layers: [{ id: 'base', ops: [] }],
    }),
    'utf8',
  );
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-anchor-'));
  writeRecipe();
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('px anchor', () => {
  it('adds an anchor and writes the recipe back canonically', () => {
    const result = run([
      'anchor',
      '--file',
      'hero.px.json',
      '--name',
      'grip_pivot',
      '--x',
      '8',
      '--y',
      '23',
    ]);
    expect(result.code).toBe(0);
    expect(result.envelope).toMatchObject({
      ok: true,
      command: 'anchor',
      name: 'grip_pivot',
      anchor: [8, 23],
      anchors: { grip_pivot: [8, 23], pivot: [8, 8] },
    });

    const text = readFileSync(join(workspace, 'hero.px.json'), 'utf8');
    expect(text).toBe(serializeRecipe(parseRecipe(text).recipe));
  });

  it('moves an existing anchor without dropping the others', () => {
    expect(
      run(['anchor', '--file', 'hero.px.json', '--name', 'pivot', '--x', '3', '--y', '4']).code,
    ).toBe(0);
    const envelope = run(['inspect', '--file', 'hero.px.json']).envelope;
    expect(envelope.ok).toBe(true);
    expect(
      parseRecipe(readFileSync(join(workspace, 'hero.px.json'), 'utf8')).recipe.anchors,
    ).toEqual({ pivot: [3, 4] });
  });

  it('records an out-of-canvas anchor with a warning rather than dropping it', () => {
    const result = run([
      'anchor',
      '--file',
      'hero.px.json',
      '--name',
      'tip',
      '--x',
      '40',
      '--y',
      '-2',
    ]);
    expect(result.code).toBe(0);
    expect(result.envelope.anchors?.tip).toEqual([40, -2]);
    expect(result.envelope.warnings?.map((warning) => warning.code)).toContain(
      'W_ANCHOR_OUT_OF_BOUNDS',
    );
  });

  it('writes to --out and leaves the source alone', () => {
    const before = readFileSync(join(workspace, 'hero.px.json'), 'utf8');
    const result = run([
      'anchor',
      '--file',
      'hero.px.json',
      '--name',
      'tip',
      '--x',
      '1',
      '--y',
      '2',
      '--out',
      'copy.px.json',
    ]);
    expect(result.code).toBe(0);
    expect(readFileSync(join(workspace, 'hero.px.json'), 'utf8')).toBe(before);
    expect(
      parseRecipe(readFileSync(join(workspace, 'copy.px.json'), 'utf8')).recipe.anchors.tip,
    ).toEqual([1, 2]);
  });

  it('rejects a missing name and a non-integer point', () => {
    const noName = run(['anchor', '--file', 'hero.px.json', '--x', '1', '--y', '2']);
    expect(noName.code).toBe(1);
    expect(noName.envelope.error?.code).toBe('E_USAGE');

    const fractional = run([
      'anchor',
      '--file',
      'hero.px.json',
      '--name',
      'tip',
      '--x',
      '1.5',
      '--y',
      '2',
    ]);
    expect(fractional.code).toBe(1);
    expect(fractional.envelope.error?.code).toBe('E_USAGE');
  });

  it('is advertised in help alongside the other verbs', () => {
    const help = run(['--help']);
    expect(help.envelope.commands).toEqual([
      'init',
      'draw',
      'edit',
      'anchor',
      'inspect',
      'render',
      'synthesize',
      'validate',
    ]);
  });
});
