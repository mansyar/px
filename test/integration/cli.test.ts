import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';

interface Envelope {
  v: number;
  ok: boolean;
  command?: string;
  error?: { code: string; message: string; hint: string; op_index?: number };
  [key: string]: unknown;
}

interface RunResult {
  code: number;
  envelope: Envelope;
  raw: string;
}

let workspace = '';

function run(args: string[]): RunResult {
  let raw = '';
  const code = runCli(args, {
    cwd: workspace,
    stdout: (text) => {
      raw += text;
    },
    stderr: () => undefined,
  });
  return { code, envelope: JSON.parse(raw) as Envelope, raw };
}

beforeAll(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-cli-'));
});

afterAll(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('cli vertical slice', () => {
  it('authors, draws, inspects, and renders a recipe end to end', () => {
    expect(
      run(['init', '--file', 'hero.px.json', '--name', 'hero', '--width', '16', '--height', '16'])
        .code,
    ).toBe(0);

    const draw = run([
      'draw',
      '--file',
      'hero.px.json',
      '--ops',
      '[["rect",4,4,8,8,"steel.base"],["set_pixels",[[6,6],[9,6]],"steel.outline"],["line",4,4,11,11,"steel.highlight"]]',
    ]);
    expect(draw.code).toBe(0);
    expect(draw.envelope).toMatchObject({
      v: 1,
      ok: true,
      command: 'draw',
      layer: 'base',
      added: 3,
    });

    const inspect = run(['inspect', '--file', 'hero.px.json', '--region', '4,4,8,2']);
    expect(inspect.code).toBe(0);
    const regions = inspect.envelope.regions as Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      matrix: string;
    }>;
    expect(regions).toHaveLength(1);
    expect(regions[0]).toMatchObject({ x: 4, y: 4, w: 8, h: 2 });
    const matrix = regions[0]?.matrix ?? '';
    expect(matrix.split('\n')).toHaveLength(4);
    expect(matrix).toContain('b');
    expect(inspect.envelope.legend).toEqual({
      b: { family: 'steel', role: 'base', hex: '#b13e53' },
      h: { family: 'steel', role: 'highlight', hex: '#ef7d57' },
    });
    expect(inspect.envelope.summary).toBeUndefined();
  });

  it('keeps the recipe canonical on disk after a draw', () => {
    expect(run(['init', '--file', 'canon.px.json', '--width', '8', '--height', '8']).code).toBe(0);
    expect(
      run(['draw', '--file', 'canon.px.json', '--ops', '[["rect",0,0,2,2,"steel.base"]]']).code,
    ).toBe(0);
    const text = readFileSync(join(workspace, 'canon.px.json'), 'utf8');
    expect(serializeRecipe(parseRecipe(text).recipe)).toBe(text);
  });

  it('renders a PNG and repeats it byte for byte', () => {
    const first = run(['render', '--file', 'hero.px.json', '--out', 'out/hero.png']);
    expect(first.code).toBe(0);
    expect(first.envelope.sha256).toMatch(/^[0-9a-f]{64}$/);
    const target = join(workspace, 'out', 'hero.png');
    expect(existsSync(target)).toBe(true);
    const png = readFileSync(target);
    expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(first.envelope.bytes).toBe(png.length);

    const second = run(['render', '--file', 'hero.px.json', '--out', 'out/hero-2.png']);
    expect(second.envelope.sha256).toBe(first.envelope.sha256);
  });

  it('prints JSON help with the documented exit codes', () => {
    const help = run(['--help']);
    expect(help.code).toBe(0);
    expect(help.envelope).toMatchObject({ v: 1, ok: true, command: 'help' });
    expect(help.envelope.exit_codes).toMatchObject({
      '0': 'success',
      '1': 'caller error',
      '2': 'usage error',
    });
  });

  it('pretty prints on request without breaking the envelope', () => {
    const pretty = run(['inspect', '--file', 'hero.px.json', '--region', '0,0,2,2', '--pretty']);
    expect(pretty.code).toBe(0);
    expect(pretty.raw.split('\n').length).toBeGreaterThan(5);
    expect(pretty.envelope.regions).toBeTypeOf('object');
  });
});

describe('cli errors', () => {
  it('reports a missing recipe as a caller error', () => {
    const result = run(['inspect', '--file', 'missing.px.json']);
    expect(result.code).toBe(1);
    expect(result.envelope.ok).toBe(false);
    expect(result.envelope.error?.code).toBe('E_FILE_NOT_FOUND');
    expect(result.envelope.error?.hint).toBeTruthy();
  });

  it('reports an unknown command as a usage error', () => {
    const result = run(['explode']);
    expect(result.code).toBe(2);
    expect(result.envelope.error?.code).toBe('E_USAGE');
  });

  it('refuses to overwrite a recipe without --force', () => {
    expect(run(['init', '--file', 'hero.px.json']).code).toBe(1);
    expect(run(['init', '--file', 'hero.px.json']).envelope.error?.code).toBe('E_FILE_EXISTS');
    expect(run(['init', '--file', 'hero.px.json', '--force']).code).toBe(0);
  });

  it('rejects an unknown op with its index', () => {
    const result = run(['draw', '--file', 'canon.px.json', '--ops', '[["spray",0,0]]']);
    expect(result.code).toBe(1);
    expect(result.envelope.error).toMatchObject({ code: 'E_UNKNOWN_OP', op_index: 1 });
  });

  it('rejects an unknown layer', () => {
    const result = run(['draw', '--file', 'canon.px.json', '--layer', 'glow', '--ops', '[]']);
    expect(result.code).toBe(1);
    expect(result.envelope.error?.code).toBe('E_NO_SUCH_LAYER');
  });

  it('rejects an out-of-canvas region', () => {
    const result = run(['inspect', '--file', 'canon.px.json', '--region', '6,6,4,4']);
    expect(result.code).toBe(1);
    expect(result.envelope.error?.code).toBe('E_BAD_PARAM');
  });

  it('rejects malformed ops JSON as a usage error', () => {
    const result = run(['draw', '--file', 'canon.px.json', '--ops', '{']);
    expect(result.code).toBe(2);
    expect(result.envelope.error?.code).toBe('E_USAGE');
  });
});
