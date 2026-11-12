import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  sha256?: string;
  [key: string]: unknown;
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
