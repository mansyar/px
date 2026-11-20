import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import {
  argvFor,
  callTool,
  MCP_TOOLS,
  type Params,
  type TextBlock,
  TOOL_DEFINITIONS,
} from '../../src/mcp/tools.js';

/**
 * AC-9: `px_frame` is a thin adapter over the `frame` CLI verb. The same recipe
 * is seeded into two workspaces; each subcommand runs through runCli in one and
 * through callTool in the other, and both the envelope and the resulting recipe
 * bytes must be identical. That is the whole parity argument — one engine, one
 * serialization, two transports.
 */

interface Envelope {
  v: number;
  ok: boolean;
  command?: string;
  subcommand?: string;
  error?: { code: string };
  [key: string]: unknown;
}

const FILE = 'walk.px.json';
const FOUR_OPS =
  '[["rect",1,1,3,3,"steel.base"],["rect",2,2,3,3,"steel.shadow"],["rect",3,3,3,3,"steel.outline"],["rect",4,4,3,3,"steel.highlight"]]';
const ONE_OP = JSON.stringify([['rect', 2, 2, 2, 2, 'steel.base']]);
const SINGLE_OP = [['rect', 2, 2, 2, 2, 'steel.base']];

let cliDir = '';
let mcpDir = '';
let baseText = '';

function cliRun(dir: string, args: string[]): { code: number; envelope: Envelope; raw: string } {
  let raw = '';
  const code = runCli(args, {
    cwd: dir,
    stdout: (text) => {
      raw += text;
    },
    stderr: () => undefined,
  });
  return { code, envelope: JSON.parse(raw) as Envelope, raw };
}

function seed(dir: string): void {
  writeFileSync(join(dir, FILE), baseText, 'utf8');
}

beforeAll(() => {
  const seedDir = mkdtempSync(join(tmpdir(), 'px-frame-seed-'));
  try {
    const step = (args: string[]): void => {
      expect(cliRun(seedDir, args).code).toBe(0);
    };
    step(['init', '--file', FILE, '--name', 'walk', '--width', '12', '--height', '12']);
    step(['draw', '--file', FILE, '--ops', FOUR_OPS]);
    step(['frame', 'add', '--file', FILE, '--from', '0', '--id', 'walk', '--duration', '120']);
    step(['frame', 'add', '--file', FILE, '--from', '0', '--id', 'run']);
    baseText = readFileSync(join(seedDir, FILE), 'utf8');
  } finally {
    rmSync(seedDir, { recursive: true, force: true });
  }
});

beforeEach(() => {
  cliDir = mkdtempSync(join(tmpdir(), 'px-frame-cli-'));
  mcpDir = mkdtempSync(join(tmpdir(), 'px-frame-mcp-'));
  seed(cliDir);
  seed(mcpDir);
});

afterEach(() => {
  rmSync(cliDir, { recursive: true, force: true });
  rmSync(mcpDir, { recursive: true, force: true });
});

function mcpFrame(params: Params): Envelope {
  const result = callTool('px_frame', params, { cwd: mcpDir });
  expect(result.isError).toBeUndefined();
  const block = result.content[0] as TextBlock;
  expect(block.type).toBe('text');
  return JSON.parse(block.text) as Envelope;
}

/** Runs the equivalent CLI step and px_frame call, then compares everything. */
function parityStep(cliArgs: string[], params: Params): void {
  const cli = cliRun(cliDir, cliArgs);
  expect(cli.code).toBe(0);
  expect(cli.envelope.ok).toBe(true);
  const mcpEnvelope = mcpFrame(params);
  expect(mcpEnvelope).toEqual(cli.envelope);
}

describe('px_frame byte parity', () => {
  it('AC-9: every subcommand produces the same envelope and recipe bytes', () => {
    const steps: Array<{ cli: string[]; params: Params }> = [
      {
        // add: --from, --id and --duration
        cli: ['frame', 'add', '--file', FILE, '--from', '0', '--id', 'jump', '--duration', '90'],
        params: { subcommand: 'add', file: FILE, from: '0', id: 'jump', duration: 90 },
      },
      {
        // edit: --frame, --op-index and --ops
        cli: ['frame', 'edit', '--file', FILE, '--frame', '1', '--op-index', '0', '--ops', ONE_OP],
        params: { subcommand: 'edit', file: FILE, frame: 1, op_index: 0, ops: SINGLE_OP },
      },
      {
        // edit: --frame by id, --layer and --replace
        cli: [
          'frame',
          'edit',
          '--file',
          FILE,
          '--frame',
          'jump',
          '--layer',
          'base',
          '--replace',
          '--ops',
          ONE_OP,
        ],
        params: {
          subcommand: 'edit',
          file: FILE,
          frame: 'jump',
          layer: 'base',
          replace: true,
          ops: SINGLE_OP,
        },
      },
      {
        // remove: --frame by id
        cli: ['frame', 'remove', '--file', FILE, '--frame', 'run'],
        params: { subcommand: 'remove', file: FILE, frame: 'run' },
      },
      {
        // set-duration: --frame by id and --duration
        cli: ['frame', 'set-duration', '--file', FILE, '--frame', 'walk', '--duration', '250'],
        params: { subcommand: 'set-duration', file: FILE, frame: 'walk', duration: 250 },
      },
      {
        // move: --frame by index and --to
        cli: ['frame', 'move', '--file', FILE, '--frame', '2', '--to', '0'],
        params: { subcommand: 'move', file: FILE, frame: 2, to: 0 },
      },
      {
        // list: read-only, after the mutations above
        cli: ['frame', 'list', '--file', FILE],
        params: { subcommand: 'list', file: FILE },
      },
    ];
    for (const step of steps) {
      parityStep(step.cli, step.params);
    }

    expect(readFileSync(join(cliDir, FILE), 'utf8')).toBe(readFileSync(join(mcpDir, FILE), 'utf8'));
  });

  it('writes to --out identically and leaves the source recipe untouched', () => {
    parityStep(
      ['frame', 'add', '--file', FILE, '--out', 'copy.px.json', '--id', 'idle', '--from', '0'],
      {
        subcommand: 'add',
        file: FILE,
        out: 'copy.px.json',
        id: 'idle',
        from: '0',
      },
    );
    expect(readFileSync(join(cliDir, FILE), 'utf8')).toBe(baseText);
    expect(readFileSync(join(mcpDir, FILE), 'utf8')).toBe(baseText);
    expect(readFileSync(join(cliDir, 'copy.px.json'), 'utf8')).toBe(
      readFileSync(join(mcpDir, 'copy.px.json'), 'utf8'),
    );
  });

  it('fails identically for a guardrail and leaves both recipes unchanged', () => {
    const cli = cliRun(cliDir, ['frame', 'remove', '--file', FILE, '--frame', '0']);
    expect(cli.code).toBe(1);
    expect(cli.envelope.ok).toBe(false);

    const result = callTool(
      'px_frame',
      { subcommand: 'remove', file: FILE, frame: 0 },
      { cwd: mcpDir },
    );
    expect(result.isError).toBe(true);
    const block = result.content[0] as TextBlock;
    const mcpEnvelope = JSON.parse(block.text) as Envelope;

    expect(mcpEnvelope).toEqual(cli.envelope);
    expect(mcpEnvelope.error?.code).toBe('E_BAD_PARAM');
    expect(readFileSync(join(cliDir, FILE), 'utf8')).toBe(baseText);
    expect(readFileSync(join(mcpDir, FILE), 'utf8')).toBe(baseText);
  });

  it('F1: a numeric-string id selector maps through argv with byte parity', () => {
    // Give both workspaces a frame whose numeric id differs from its position.
    for (const dir of [cliDir, mcpDir]) {
      expect(cliRun(dir, ['frame', 'add', '--file', FILE, '--from', '0', '--id', '5']).code).toBe(
        0,
      );
    }
    // frames: walk(1), run(2), 5(3). --frame 5 must target id "5", not index 5.
    parityStep(['frame', 'edit', '--file', FILE, '--frame', '5', '--replace', '--ops', ONE_OP], {
      subcommand: 'edit',
      file: FILE,
      frame: '5',
      replace: true,
      ops: SINGLE_OP,
    });
    const cliText = readFileSync(join(cliDir, FILE), 'utf8');
    expect(cliText).toBe(readFileSync(join(mcpDir, FILE), 'utf8'));
    const edited = parseRecipe(cliText).recipe;
    expect(edited.frames?.find((frame) => frame.id === '5')?.layers[0]?.ops).toEqual([
      { op: 'rect', x: 2, y: 2, w: 2, h: 2, color: 'steel.base' },
    ]);
    expect(edited.frames?.find((frame) => frame.id === 'walk')?.layers[0]?.ops).toHaveLength(4);
  });
});

describe('px_frame registration', () => {
  it('is published as a tool and maps the subcommand plus every flag', () => {
    expect(MCP_TOOLS).toContain('px_frame');
    const definition = TOOL_DEFINITIONS.find((tool) => tool.name === 'px_frame');
    expect(definition).toBeDefined();
    expect(definition?.inputSchema.required).toEqual(['subcommand', 'file']);

    expect(argvFor('px_frame', { subcommand: 'list', file: FILE })).toEqual([
      'frame',
      'list',
      '--file',
      FILE,
    ]);
    expect(
      argvFor('px_frame', {
        subcommand: 'move',
        file: FILE,
        frame: 2,
        to: 0,
        out: 'copy.px.json',
        strict: true,
      }),
    ).toEqual([
      'frame',
      'move',
      '--file',
      FILE,
      '--out',
      'copy.px.json',
      '--frame',
      '2',
      '--to',
      '0',
      '--strict',
    ]);
  });
});
