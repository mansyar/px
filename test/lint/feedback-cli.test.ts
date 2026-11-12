import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

interface Envelope {
  v: number;
  ok: boolean;
  command?: string;
  error?: { code: string; message: string; hint: string };
  findings?: Array<{ code: string; severity: string; message: string; truncated?: boolean }>;
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

function write(name: string, ops: unknown[], colors: string[] = ['#000000', '#ffffff']): void {
  writeFileSync(
    join(workspace, name),
    JSON.stringify({
      version: 1,
      meta: { name: name.replace('.px.json', ''), width: 8, height: 8, alpha_mode: 'binary' },
      palette: { main: { colors } },
      anchors: { pivot: [3, 3] },
      layers: [{ id: 'base', ops }],
    }),
    'utf8',
  );
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-feedback-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('validate', () => {
  it('reports bounds, pixel count, findings, and warnings without writing anything', () => {
    write('clean.px.json', [['rect', 1, 1, 4, 4, 'main.0']]);
    const before = readdirSync(workspace);

    const result = run(['validate', '--file', 'clean.px.json']);

    expect(result.code).toBe(0);
    expect(result.envelope).toMatchObject({
      v: 1,
      ok: true,
      command: 'validate',
      file: 'clean.px.json',
      canvas: { width: 8, height: 8 },
      bounds: { x: 1, y: 1, w: 4, h: 4 },
      pixel_count: 16,
      findings: [],
      warnings: [],
    });
    expect(readdirSync(workspace)).toEqual(before);
  });

  it('returns the clipping warning and its finding', () => {
    write('clip.px.json', [['rect', -2, -2, 4, 4, 'main.0']]);
    const result = run(['validate', '--file', 'clip.px.json']);

    expect(result.code).toBe(0);
    const warnings = result.envelope.warnings as Array<{ code: string }>;
    expect(warnings.map((warning) => warning.code)).toEqual(['W_OUT_OF_BOUNDS']);
    expect(result.envelope.findings).toHaveLength(1);
    expect(result.envelope.findings?.[0]).toMatchObject({
      code: 'OUT_OF_BOUNDS',
      severity: 'warning',
    });
  });

  it('reports a null bounds box for an empty recipe', () => {
    write('empty.px.json', []);
    const result = run(['validate', '--file', 'empty.px.json']);

    expect(result.code).toBe(0);
    expect(result.envelope.bounds).toBeNull();
    expect(result.envelope.pixel_count).toBe(0);
  });
});

describe('render findings and the debug sheet', () => {
  it('always reports findings in the render payload', () => {
    write('clean.px.json', [['rect', 0, 0, 8, 8, 'main.0']]);
    const result = run(['render', '--file', 'clean.px.json', '--out', 'hero.png']);
    expect(result.code).toBe(0);
    expect(result.envelope.findings).toEqual([]);
  });

  it('writes the debug sheet only when asked and repeats it byte for byte', () => {
    write('clean.px.json', [['rect', 1, 1, 4, 4, 'main.0']]);

    const plain = run(['render', '--file', 'clean.px.json', '--out', 'plain.png']);
    expect(plain.code).toBe(0);
    expect(plain.envelope.debug).toBeUndefined();
    expect(readdirSync(workspace).filter((entry) => entry.endsWith('.debug.png'))).toEqual([]);

    const first = run(['render', '--file', 'clean.px.json', '--out', 'out/hero.png', '--debug']);
    expect(first.code).toBe(0);
    const debug = first.envelope.debug as Record<string, unknown>;
    expect(debug.out).toBe('out/hero.debug.png');
    expect(debug.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.keys(debug)).toEqual(['out', 'width', 'height', 'bytes', 'sha256']);

    const second = run(['render', '--file', 'clean.px.json', '--out', 'out/again.png', '--debug']);
    expect((second.envelope.debug as Record<string, unknown>).sha256).toBe(debug.sha256);
  });

  it('writes a sheet that is a valid PNG next to the render', () => {
    write('clean.px.json', [['rect', 1, 1, 4, 4, 'main.0']]);
    run(['render', '--file', 'clean.px.json', '--out', 'hero.png', '--debug']);
    const sheet = readFileSync(join(workspace, 'hero.debug.png'));
    expect(Array.from(sheet.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });
});

describe('strict mode', () => {
  it('promotes a warning to exit 3 with the findings intact', () => {
    write('clip.px.json', [['rect', -2, -2, 4, 4, 'main.0']]);

    const lenient = run(['validate', '--file', 'clip.px.json']);
    expect(lenient.code).toBe(0);
    expect(lenient.envelope.ok).toBe(true);

    const strict = run(['validate', '--file', 'clip.px.json', '--strict']);
    expect(strict.code).toBe(3);
    expect(strict.envelope.ok).toBe(false);
    expect(strict.envelope.error?.code).toBe('E_LINT_GATE');
    expect(strict.envelope.error?.hint).toContain('--strict');
    expect(strict.envelope.findings).toHaveLength(1);
  });

  it('fails a render the same way without losing the sha', () => {
    write('clip.px.json', [['rect', -2, -2, 4, 4, 'main.0']]);
    const result = run(['render', '--file', 'clip.px.json', '--out', 'hero.png', '--strict']);

    expect(result.code).toBe(3);
    expect(result.envelope.ok).toBe(false);
    expect(result.envelope.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('never fails on info findings', () => {
    write('jaggy.px.json', [
      [
        'set_pixels',
        [
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0],
          [4, 0],
          [5, 0],
          [0, 1],
          [1, 1],
          [2, 1],
          [3, 1],
          [4, 1],
          [5, 1],
          [1, 2],
          [2, 2],
          [3, 2],
          [4, 2],
          [5, 2],
          [2, 3],
          [3, 3],
          [4, 3],
          [5, 3],
          [2, 4],
          [3, 4],
          [4, 4],
          [5, 4],
          [2, 5],
          [3, 5],
          [4, 5],
          [5, 5],
        ],
        'main.0',
      ],
    ]);
    const result = run(['validate', '--file', 'jaggy.px.json', '--strict']);

    expect(result.code).toBe(0);
    expect(result.envelope.ok).toBe(true);
    expect(result.envelope.findings?.some((finding) => finding.code === 'JAGGY_LINE')).toBe(true);
    expect(result.envelope.findings?.every((finding) => finding.severity === 'info')).toBe(true);
  });

  it('leaves a clean sprite at exit 0', () => {
    write('clean.px.json', [['rect', 1, 1, 4, 4, 'main.0']]);
    const result = run(['validate', '--file', 'clean.px.json', '--strict']);
    expect(result.code).toBe(0);
    expect(result.envelope.ok).toBe(true);
  });
});

describe('help surface', () => {
  it('lists validate, --debug, and --strict with the lint gate exit code', () => {
    const result = run(['--help']);
    expect(result.code).toBe(0);
    expect(result.envelope.commands).toContain('validate');
    expect(result.envelope.flags).toContain('--strict');
    expect(result.envelope.flags).toContain('--debug');
    expect(result.envelope.exit_codes).toMatchObject({ '3': 'lint gate under --strict' });
  });
});
