import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { PxError } from '../../src/core/errors.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';

interface IndexEntry {
  index: number;
  id: string | null;
  layer: string;
  op: { op: string };
}

interface Envelope {
  v: number;
  ok: boolean;
  command?: string;
  layer?: string;
  replaced?: number;
  added?: number;
  layer_ops?: number;
  op_index?: IndexEntry[];
  error?: { code: string; message: string; hint?: string; op_index?: number };
  [key: string]: unknown;
}

interface CliResult {
  code: number;
  envelope: Envelope;
}

let workspace: string;

beforeAll(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-addr-'));
});

afterAll(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function run(args: string[]): CliResult {
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

function initFile(name: string): string {
  const file = join(workspace, name);
  const result = run(['init', '--file', file, '--name', name, '--width', '16', '--height', '16']);
  expect(result.code).toBe(0);
  return file;
}

function writeRecipe(name: string, text: string): string {
  const file = join(workspace, name);
  writeFileSync(file, text, 'utf8');
  return file;
}

function recipeText(ops: unknown[], layers?: unknown[]): string {
  return JSON.stringify({
    version: 1,
    meta: { name: 'addr', width: 16, height: 16, alpha_mode: 'binary' },
    palette: { ink: { colors: ['#ffffff'] }, steel: { ramp: { base: '#880000' } } },
    anchors: {},
    layers: layers ?? [{ id: 'base', ops }],
  });
}

function codeOf(work: () => unknown): string {
  try {
    work();
    return 'NO_THROW';
  } catch (error) {
    return error instanceof PxError ? error.code : 'NOT_PX';
  }
}

const SET_PIXEL = { op: 'set_pixels', points: [[7, 7]], color: 'steel.base' };

describe('op_index map', () => {
  it('reports every op with its index, id, layer, and body on draw', () => {
    const file = initFile('map.px.json');
    const result = run([
      'draw',
      '--file',
      file,
      '--ops',
      JSON.stringify([
        { op: 'rect', x: 1, y: 1, w: 2, h: 2, color: 'steel.base', id: 'body' },
        { op: 'set_pixels', points: [[0, 0]], color: 'steel.outline' },
      ]),
    ]);
    expect(result.code).toBe(0);
    expect(result.envelope.op_index).toEqual([
      {
        index: 0,
        id: 'body',
        layer: 'base',
        op: { op: 'rect', id: 'body', x: 1, y: 1, w: 2, h: 2, color: 'steel.base' },
      },
      {
        index: 1,
        id: null,
        layer: 'base',
        op: { op: 'set_pixels', points: [[0, 0]], color: 'steel.outline' },
      },
    ]);
  });

  it('writes the id into the canonical recipe text', () => {
    const file = initFile('canonical.px.json');
    run([
      'draw',
      '--file',
      file,
      '--ops',
      JSON.stringify([{ op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'steel.base', id: 'body' }]),
    ]);
    const text = readFileSync(file, 'utf8');
    expect(text).toContain('"id": "body"');
    expect(parseRecipe(text).recipe.layers[0]?.ops[0]?.id).toBe('body');
  });

  it('rejects a recipe that reuses an id', () => {
    const text = recipeText([
      { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'steel.base', id: 'same' },
      { op: 'rect', x: 4, y: 0, w: 2, h: 2, color: 'steel.base', id: 'same' },
    ]);
    expect(codeOf(() => parseRecipe(text))).toBe('E_DUPLICATE_OP_ID');
  });
});

describe('edit addressing', () => {
  it('finds an op by id after an earlier op is inserted', () => {
    const file = initFile('by-id.px.json');
    run([
      'draw',
      '--file',
      file,
      '--ops',
      JSON.stringify([
        { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'steel.base', id: 'first' },
        { op: 'rect', x: 4, y: 0, w: 2, h: 2, color: 'steel.base', id: 'target' },
        { op: 'rect', x: 8, y: 0, w: 2, h: 2, color: 'steel.base', id: 'last' },
      ]),
    ]);

    const source = JSON.parse(readFileSync(file, 'utf8')) as {
      layers: { ops: unknown[] }[];
    };
    source.layers[0]?.ops.unshift(SET_PIXEL);
    writeFileSync(file, JSON.stringify(source), 'utf8');

    const result = run([
      'edit',
      '--file',
      file,
      '--id',
      'target',
      '--ops',
      JSON.stringify([{ op: 'rect', x: 4, y: 4, w: 3, h: 3, color: 'steel.base', id: 'target' }]),
    ]);
    expect(result.code).toBe(0);
    expect(result.envelope.replaced).toBe(2);
    expect(result.envelope.layer_ops).toBe(4);
    const map = result.envelope.op_index ?? [];
    expect(map.map((entry) => entry.id)).toEqual([null, 'first', 'target', 'last']);
    expect(map[2]?.op).toEqual({
      op: 'rect',
      id: 'target',
      x: 4,
      y: 4,
      w: 3,
      h: 3,
      color: 'steel.base',
    });
  });

  it('replaces by index within the named layer', () => {
    const file = initFile('by-index.px.json');
    run([
      'draw',
      '--file',
      file,
      '--ops',
      JSON.stringify([
        { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'steel.base' },
        { op: 'rect', x: 4, y: 0, w: 2, h: 2, color: 'steel.base' },
      ]),
    ]);

    const result = run([
      'edit',
      '--file',
      file,
      '--layer',
      'base',
      '--op-index',
      '0',
      '--ops',
      JSON.stringify([{ op: 'line', x1: 0, y1: 0, x2: 5, y2: 5, color: 'steel.highlight' }]),
    ]);
    expect(result.code).toBe(0);
    expect(result.envelope.replaced).toBe(0);
    expect(result.envelope.layer_ops).toBe(2);
    expect(result.envelope.op_index?.[0]?.op).toEqual({
      op: 'line',
      x1: 0,
      y1: 0,
      x2: 5,
      y2: 5,
      color: 'steel.highlight',
    });
  });

  it('searches every layer when --layer is omitted', () => {
    const file = writeRecipe(
      'multi.px.json',
      recipeText(
        [],
        [
          { id: 'base', ops: [{ op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'ink.0', id: 'near' }] },
          { id: 'fx', ops: [{ op: 'set_pixels', points: [[1, 1]], color: 'ink.0', id: 'far' }] },
        ],
      ),
    );

    const result = run([
      'edit',
      '--file',
      file,
      '--id',
      'far',
      '--ops',
      JSON.stringify([{ op: 'set_pixels', points: [[2, 2]], color: 'ink.0', id: 'far' }]),
    ]);
    expect(result.code).toBe(0);
    expect(result.envelope.layer).toBe('fx');
    expect(result.envelope.replaced).toBe(0);
    expect(result.envelope.op_index?.map((entry) => [entry.layer, entry.id])).toEqual([
      ['base', 'near'],
      ['fx', 'far'],
    ]);
  });

  it('names the missing id in E_NO_SUCH_OP', () => {
    const file = initFile('missing-id.px.json');
    run([
      'draw',
      '--file',
      file,
      '--ops',
      JSON.stringify([{ op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'steel.base', id: 'body' }]),
    ]);

    const result = run(['edit', '--file', file, '--id', 'ghost', '--ops', '[]']);
    expect(result.code).toBe(1);
    expect(result.envelope.error?.code).toBe('E_NO_SUCH_OP');
    expect(result.envelope.error?.message).toContain('ghost');
    expect(result.envelope.error?.hint).toContain('body');
  });

  it('reports the valid index range for an out-of-range op index', () => {
    const file = initFile('bad-index.px.json');
    run([
      'draw',
      '--file',
      file,
      '--ops',
      JSON.stringify([
        { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'steel.base' },
        { op: 'rect', x: 4, y: 0, w: 2, h: 2, color: 'steel.base' },
      ]),
    ]);

    const result = run([
      'edit',
      '--file',
      file,
      '--layer',
      'base',
      '--op-index',
      '9',
      '--ops',
      '[]',
    ]);
    expect(result.code).toBe(1);
    expect(result.envelope.error?.code).toBe('E_NO_SUCH_OP');
    expect(result.envelope.error?.message).toContain('index 9');
    expect(result.envelope.error?.hint).toContain('0-1');
  });

  it('requires an address when --id and --op-index are both absent', () => {
    const file = initFile('no-address.px.json');
    const result = run(['edit', '--file', file, '--ops', '[]']);
    expect(result.code).toBe(2);
    expect(result.envelope.error?.code).toBe('E_USAGE');
  });

  it('reports an empty layer instead of a negative range', () => {
    const file = writeRecipe('empty.px.json', recipeText([]));
    const result = run([
      'edit',
      '--file',
      file,
      '--layer',
      'base',
      '--op-index',
      '0',
      '--ops',
      '[]',
    ]);
    expect(result.code).toBe(1);
    expect(result.envelope.error?.code).toBe('E_NO_SUCH_OP');
    expect(result.envelope.error?.hint).toContain('has no ops');
  });
});
