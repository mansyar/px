import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import { callTool, type ToolResult } from '../../src/mcp/tools.js';

/**
 * P1.T4 — `facing` must be reachable from every surface an author has.
 *
 * A field only the TypeScript model knows about is the previous track's High
 * finding repeating: the headline feature exists and no tool can set it. So the
 * same declaration is driven through the recipe file, `px init --parts` and
 * `px_init`, and each path is proven to change the rendered bytes.
 */

const PALETTE = '#101820,#303840,#8090a0,#f0f4f8';
const RECT = {
  op: 'rect',
  x: 2,
  y: 2,
  w: 8,
  h: 8,
  color: 'main.base',
  part: 'wall',
};
const LIGHT = { op: 'light', form: 'flat', ao: false, rim: 'none' };
const OPS = JSON.stringify([RECT, LIGHT]);

interface Envelope {
  ok?: boolean;
  exit_code?: number;
  sha256?: string;
  error?: { code: string; message: string; hint?: string };
  warnings?: Array<{ code: string }>;
}

const workspaces: string[] = [];

function workspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'px-facing-'));
  workspaces.push(dir);
  return dir;
}

function call(cwd: string, argv: string[]): { code: number; envelope: Envelope } {
  let stdout = '';
  let stderr = '';
  const code = runCli(argv, {
    cwd,
    stdout: (text: string) => {
      stdout += text;
    },
    stderr: (text: string) => {
      stderr += text;
    },
  });
  const envelope = JSON.parse(stdout || '{}') as Envelope;
  if (code !== 0 && envelope.ok !== false) {
    throw new Error(`${argv.join(' ')} failed (${code}): ${stderr || stdout}`);
  }
  return { code, envelope };
}

function init(cwd: string, parts: string): void {
  const { code } = call(cwd, [
    'init',
    '--file',
    'wall.px.json',
    '--name',
    'wall',
    '--width',
    '16',
    '--height',
    '16',
    '--palette',
    PALETTE,
    '--parts',
    parts,
  ]);
  expect(code).toBe(0);
}

function drawAndRender(cwd: string): string {
  expect(call(cwd, ['draw', '--file', 'wall.px.json', '--ops', OPS]).code).toBe(0);
  const { code, envelope } = call(cwd, ['render', '--file', 'wall.px.json', '--out', 'out.png']);
  expect(code).toBe(0);
  expect(envelope.sha256).toMatch(/^[0-9a-f]{64}$/);
  return envelope.sha256 ?? '';
}

afterEach(() => {
  for (const dir of workspaces.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('--parts authors facing', () => {
  it('writes a named facing and renders a different image than no facing', () => {
    const plain = workspace();
    const facing = workspace();
    init(plain, '{"wall":{"material":"main"}}');
    init(facing, '{"wall":{"material":"main","facing":"right"}}');

    const text = readFileSync(join(facing, 'wall.px.json'), 'utf8');
    expect(text).toContain('"facing": "right"');
    expect(parseRecipe(text).recipe.parts?.wall?.facing).toBe('right');

    expect(drawAndRender(facing)).not.toBe(drawAndRender(plain));
  });

  it('accepts a facing file path as well as inline JSON', () => {
    const dir = workspace();
    const partsFile = join(dir, 'parts.json');
    writeFileSync(
      partsFile,
      JSON.stringify({ wall: { material: 'main', gloss: 'matte', facing: [0, 0, 1] } }),
    );
    init(dir, './parts.json');
    const text = readFileSync(join(dir, 'wall.px.json'), 'utf8');
    expect(text).toContain('"facing": [');
    expect(serializeRecipe(parseRecipe(text).recipe)).toBe(text);
  });

  it('exits non-zero with a hint naming the legal facings (AC-4)', () => {
    const dir = workspace();
    const { code, envelope } = call(dir, [
      'init',
      '--file',
      'bad.px.json',
      '--width',
      '16',
      '--height',
      '16',
      '--palette',
      PALETTE,
      '--parts',
      '{"wall":{"material":"main","facing":"sideways"}}',
    ]);
    expect(code).not.toBe(0);
    expect(envelope.error?.code).toBe('E_FACING_UNKNOWN');
    expect(envelope.error?.hint).toContain('front');
    expect(envelope.error?.hint).toContain('[x, y, z]');
  });
});

describe('px_init authors facing', () => {
  function envelope(result: ToolResult): Envelope {
    const block = result.content.find((entry) => entry.type === 'text');
    if (block === undefined || block.type !== 'text') {
      throw new Error('expected a text content block');
    }
    return JSON.parse(block.text) as Envelope;
  }

  function mcpRun(dir: string, parts: Record<string, unknown>): string {
    const created = envelope(
      callTool(
        'px_init',
        {
          file: 'wall.px.json',
          name: 'wall',
          width: 16,
          height: 16,
          palette: PALETTE,
          parts,
        },
        { cwd: dir },
      ),
    );
    expect(created.ok).toBe(true);
    const drawn = envelope(
      callTool('px_draw', { file: 'wall.px.json', ops: [RECT, LIGHT] }, { cwd: dir }),
    );
    expect(drawn.ok).toBe(true);
    const rendered = envelope(
      callTool('px_render', { file: 'wall.px.json', out: 'out.png' }, { cwd: dir }),
    );
    expect(rendered.ok).toBe(true);
    const text = readFileSync(join(dir, 'wall.px.json'), 'utf8');
    expect(text).not.toContain('E_FACING');
    return rendered.sha256 ?? '';
  }

  it('round-trips a part with facing and shades it', () => {
    const plain = workspace();
    const facing = workspace();
    expect(mcpRun(plain, { wall: { material: 'main' } })).not.toBe(
      mcpRun(facing, { wall: { material: 'main', facing: 'right' } }),
    );
    expect(readFileSync(join(facing, 'wall.px.json'), 'utf8')).toContain('"facing": "right"');
  });

  it('accepts the vector form', () => {
    const dir = workspace();
    mcpRun(dir, { wall: { material: 'main', facing: [0.6, 0.8, 0] } });
    expect(readFileSync(join(dir, 'wall.px.json'), 'utf8')).toContain('"facing": [');
  });
});
