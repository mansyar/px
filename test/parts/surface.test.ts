/**
 * The parts surface a client sees (FR-2, FR-3): `part` rides inside ops, so
 * `px draw` and `px_draw` accept it with no new flag or parameter, and inspect
 * and render grow a `parts` array only for recipes that declare parts.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import type { Recipe } from '../../src/core/recipe/types.js';
import { callTool } from '../../src/mcp/tools.js';

interface Envelope {
  v: number;
  ok: boolean;
  command?: string;
  parts?: Array<{
    name: string;
    material: string;
    gloss: string;
    z: number;
    painted: number;
    bounds: { x: number; y: number; w: number; h: number } | null;
  }>;
  error?: { code: string };
  [key: string]: unknown;
}

let workspace = '';

function run(args: string[]): { code: number; envelope: Envelope; raw: string } {
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

/** `px init`, then declare a part by rewriting the file it wrote. */
function initWithBlade(name: string): void {
  expect(
    run(['init', '--file', name, '--name', 'parts', '--width', '8', '--height', '8']).code,
  ).toBe(0);
  const path = join(workspace, name);
  const recipe = parseRecipe(readFileSync(path, 'utf8')).recipe;
  const withParts: Recipe = {
    ...recipe,
    parts: { blade: { material: 'steel', gloss: 'matte', z: 0 } },
  };
  writeFileSync(path, serializeRecipe(withParts), 'utf8');
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-parts-surface-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('px draw', () => {
  it('accepts a part tag inside an op object and writes it canonically', () => {
    initWithBlade('tagged.px.json');
    const draw = run([
      'draw',
      '--file',
      'tagged.px.json',
      '--ops',
      '[{"op":"rect","x":1,"y":1,"w":2,"h":2,"color":"steel.base","part":"blade"}]',
    ]);

    expect(draw.code).toBe(0);
    const text = readFileSync(join(workspace, 'tagged.px.json'), 'utf8');
    expect(text).toContain('"part": "blade"');
    expect(text.startsWith('{\n  "version": "1.1",\n')).toBe(true);
  });

  it('still rejects a part tag on an op that inherits ownership', () => {
    initWithBlade('mirror.px.json');
    const draw = run([
      'draw',
      '--file',
      'mirror.px.json',
      '--ops',
      '[{"op":"mirror","axis":"x","pivot":4,"part":"blade"}]',
    ]);

    expect(draw.code).not.toBe(0);
    expect(draw.envelope.error?.code).toBe('E_BAD_PARAM');
  });

  it('names the declared parts when an op tags an undeclared one', () => {
    initWithBlade('unknown.px.json');
    const draw = run([
      'draw',
      '--file',
      'unknown.px.json',
      '--ops',
      '[{"op":"rect","x":0,"y":0,"w":1,"h":1,"color":"steel.base","part":"hilt"}]',
    ]);

    expect(draw.code).not.toBe(0);
    expect(draw.envelope.error?.code).toBe('E_PART_UNKNOWN');
    expect((draw.envelope.error as { hint?: string }).hint).toContain('blade');
  });
});

describe('inspect and render', () => {
  it('reports per-part name, material, gloss, z, painted count and bounds', () => {
    initWithBlade('inspect.px.json');
    run([
      'draw',
      '--file',
      'inspect.px.json',
      '--ops',
      '[{"op":"rect","x":1,"y":1,"w":2,"h":2,"color":"steel.base","part":"blade"}]',
    ]);
    const inspect = run(['inspect', '--file', 'inspect.px.json', '--summary']);

    expect(inspect.code).toBe(0);
    expect(inspect.envelope.parts).toEqual([
      {
        name: 'blade',
        material: 'steel',
        gloss: 'matte',
        z: 0,
        painted: 4,
        bounds: { x: 1, y: 1, w: 2, h: 2 },
        tones: [{ slot: 'steel.base', count: 4 }],
        slot_count: 1,
        values: [0, 4, 0, 0, 0, 0, 0, 0],
      },
    ]);
  });

  it('exposes part names on a render', () => {
    initWithBlade('render.px.json');
    run([
      'draw',
      '--file',
      'render.px.json',
      '--ops',
      '[{"op":"rect","x":1,"y":1,"w":2,"h":2,"color":"steel.base","part":"blade"}]',
    ]);
    const render = run(['render', '--file', 'render.px.json', '--out', 'render.png']);

    expect(render.code).toBe(0);
    expect(render.envelope.parts?.map((part) => part.name)).toEqual(['blade']);
  });

  it('leaves a part-less envelope exactly as it was, with no parts key', () => {
    run(['init', '--file', 'plain.px.json', '--name', 'plain', '--width', '8', '--height', '8']);
    run([
      'draw',
      '--file',
      'plain.px.json',
      '--ops',
      '[{"op":"rect","x":1,"y":1,"w":2,"h":2,"color":"steel.base"}]',
    ]);
    const inspect = run(['inspect', '--file', 'plain.px.json', '--summary']);
    const render = run(['render', '--file', 'plain.px.json', '--out', 'plain.png']);

    expect(inspect.code).toBe(0);
    expect(render.code).toBe(0);
    expect('parts' in inspect.envelope).toBe(false);
    expect('parts' in render.envelope).toBe(false);
    expect(Object.keys(inspect.envelope)).toEqual([
      'v',
      'ok',
      'command',
      'file',
      'canvas',
      'regions',
      'legend',
      'summary',
      'layers',
    ]);
  });
});

describe('px_draw / px_inspect over MCP', () => {
  it('takes the part tag from the ops array and reports parts back', () => {
    initWithBlade('mcp.px.json');
    const draw = callTool(
      'px_draw',
      {
        file: 'mcp.px.json',
        ops: [{ op: 'rect', x: 2, y: 2, w: 3, h: 1, color: 'steel.base', part: 'blade' }],
      },
      { cwd: workspace },
    );
    expect(draw.isError).toBeUndefined();

    const inspect = callTool(
      'px_inspect',
      { file: 'mcp.px.json', summary: true },
      { cwd: workspace },
    );
    expect(inspect.isError).toBeUndefined();
    const blocks = inspect.content as Array<{ type: string; text?: string }>;
    const envelope = JSON.parse(blocks[0]?.text ?? '{}') as Envelope;

    expect(envelope.parts).toEqual([
      {
        name: 'blade',
        material: 'steel',
        gloss: 'matte',
        z: 0,
        painted: 3,
        bounds: { x: 2, y: 2, w: 3, h: 1 },
        tones: [{ slot: 'steel.base', count: 3 }],
        slot_count: 1,
        values: [0, 3, 0, 0, 0, 0, 0, 0],
      },
    ]);
  });
});
