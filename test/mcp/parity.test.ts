import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { callTool, type ImageBlock, type Params, type TextBlock } from '../../src/mcp/tools.js';
import { sha256Hex } from '../../src/render/render.js';

/**
 * P6.T2.2: the same recipe through the CLI and through MCP yields the same
 * output. The two workspaces are separate copies, both driven by the same
 * relative paths, so the only thing under comparison is the engine's answer.
 *
 * The transport-only fields stripped before comparing are exactly the MCP
 * content blocks: the `text` wrapper that frames the envelope and the `image`
 * block carrying PNG bytes. Everything else in the envelope must be identical.
 */

const PALETTE = '#1a1c2c,#5d275d,#b13e53,#ef7d57';

const OPS = [
  ['rect', 4, 4, 8, 8, 'main.base'],
  [
    'set_pixels',
    [
      [6, 6],
      [9, 6],
    ],
    'main.outline',
  ],
  ['line', 4, 4, 11, 11, 'main.highlight'],
];

let cliDir = '';
let mcpDir = '';

beforeEach(() => {
  cliDir = mkdtempSync(join(tmpdir(), 'px-parity-cli-'));
  mcpDir = mkdtempSync(join(tmpdir(), 'px-parity-mcp-'));
});

afterEach(() => {
  rmSync(cliDir, { recursive: true, force: true });
  rmSync(mcpDir, { recursive: true, force: true });
});

interface Envelope {
  v: number;
  ok: boolean;
  command?: string;
  [key: string]: unknown;
}

function cliStep(args: string[]): Envelope {
  let raw = '';
  const code = runCli(args, {
    cwd: cliDir,
    stdout: (text) => {
      raw += text;
    },
    stderr: () => undefined,
  });
  expect(code).toBe(0);
  const envelope = JSON.parse(raw) as Envelope;
  expect(envelope.ok).toBe(true);
  return envelope;
}

function mcpStep(tool: string, params: Params): { envelope: Envelope; content: unknown[] } {
  const result = callTool(tool, params, { cwd: mcpDir });
  expect(result.isError).toBeUndefined();
  const blocks = result.content as Array<TextBlock | ImageBlock>;
  expect(blocks[0]?.type).toBe('text');
  const envelope = JSON.parse((blocks[0] as TextBlock).text) as Envelope;
  expect(envelope.ok).toBe(true);
  return { envelope, content: blocks.slice(1) };
}

function bytes(dir: string, path: string): Buffer {
  return readFileSync(join(dir, path));
}

describe('CLI and MCP parity', () => {
  const steps: Array<{ cli: string[]; tool: string; params: Params }> = [
    {
      cli: [
        'init',
        '--file',
        'hero.px.json',
        '--name',
        'hero',
        '--width',
        '16',
        '--height',
        '16',
        '--palette',
        PALETTE,
      ],
      tool: 'px_init',
      params: { file: 'hero.px.json', name: 'hero', width: 16, height: 16, palette: PALETTE },
    },
    {
      cli: [
        'init',
        '--file',
        'ramped.px.json',
        '--name',
        'ramped',
        '--width',
        '8',
        '--height',
        '8',
        '--palette',
        'pico8',
        '--derive-ramps',
      ],
      tool: 'px_init',
      params: {
        file: 'ramped.px.json',
        name: 'ramped',
        width: 8,
        height: 8,
        palette: 'pico8',
        derive_ramps: true,
      },
    },
    {
      cli: [
        'init',
        '--file',
        'ramped.px.json',
        '--name',
        'ramped',
        '--width',
        '8',
        '--height',
        '8',
        '--palette',
        'pico8',
        '--derive-ramps',
        '--force',
      ],
      tool: 'px_init',
      params: {
        file: 'ramped.px.json',
        name: 'ramped',
        width: 8,
        height: 8,
        palette: 'pico8',
        derive_ramps: true,
        force: true,
      },
    },
    {
      cli: ['draw', '--file', 'hero.px.json', '--ops', JSON.stringify(OPS)],
      tool: 'px_draw',
      params: { file: 'hero.px.json', ops: OPS },
    },
    {
      cli: ['anchor', '--file', 'hero.px.json', '--name', 'hand', '--x', '12', '--y', '6'],
      tool: 'px_anchor',
      params: { file: 'hero.px.json', name: 'hand', x: 12, y: 6 },
    },
    {
      cli: [
        'inspect',
        '--file',
        'hero.px.json',
        '--region',
        '4,4,8,2',
        '--region',
        '0,0,16,4',
        '--summary',
      ],
      tool: 'px_inspect',
      params: { file: 'hero.px.json', regions: ['4,4,8,2', '0,0,16,4'], summary: true },
    },
    {
      cli: ['validate', '--file', 'hero.px.json'],
      tool: 'px_validate',
      params: { file: 'hero.px.json' },
    },
    {
      cli: [
        'edit',
        '--file',
        'hero.px.json',
        '--layer',
        'base',
        '--op-index',
        '0',
        '--ops',
        JSON.stringify([['rect', 5, 5, 6, 6, 'main.shadow']]),
      ],
      tool: 'px_edit',
      params: {
        file: 'hero.px.json',
        layer: 'base',
        op_index: 0,
        ops: [['rect', 5, 5, 6, 6, 'main.shadow']],
      },
    },
  ];

  it('returns byte-identical envelopes for every verb', () => {
    for (const step of steps) {
      const cliEnvelope = cliStep(step.cli);
      const { envelope } = mcpStep(step.tool, step.params);
      expect(envelope).toEqual(cliEnvelope);
    }

    expect(bytes(cliDir, 'hero.px.json').toString()).toBe(bytes(mcpDir, 'hero.px.json').toString());
  });

  it('renders the same PNG, debug sheet and metadata through both paths', () => {
    for (const step of steps) {
      cliStep(step.cli);
      mcpStep(step.tool, step.params);
    }

    const cliEnvelope = cliStep([
      'render',
      '--file',
      'hero.px.json',
      '--out',
      'out/hero.png',
      '--export',
      '--debug',
    ]);
    const { envelope, content } = mcpStep('px_render', {
      file: 'hero.px.json',
      out: 'out/hero.png',
      export: true,
      debug: true,
    });

    // Nothing but the transport blocks differs.
    expect(envelope).toEqual(cliEnvelope);
    expect(envelope.sha256).toBe(cliEnvelope.sha256);

    const cliPng = bytes(cliDir, 'out/hero.png');
    const mcpPng = bytes(mcpDir, 'out/hero.png');
    expect(sha256Hex(mcpPng)).toBe(sha256Hex(cliPng));
    expect(mcpPng.equals(cliPng)).toBe(true);

    expect(bytes(mcpDir, 'out/hero.meta.json')).toEqual(bytes(cliDir, 'out/hero.meta.json'));
    expect(bytes(mcpDir, 'out/hero.debug.png')).toEqual(bytes(cliDir, 'out/hero.debug.png'));

    const blocks = content as ImageBlock[];
    expect(blocks).toHaveLength(2);
    for (const block of blocks) {
      expect(block.type).toBe('image');
      expect(block.mimeType).toBe('image/png');
    }
    const first = Buffer.from(blocks[0]?.data ?? '', 'base64');
    expect(first.equals(cliPng)).toBe(true);
    const sheet = Buffer.from(blocks[1]?.data ?? '', 'base64');
    expect(sheet.equals(bytes(cliDir, 'out/hero.debug.png'))).toBe(true);
  });

  it('diffs the same way in both paths', () => {
    for (const step of steps) {
      cliStep(step.cli);
      mcpStep(step.tool, step.params);
    }
    cliStep(['render', '--file', 'hero.px.json', '--out', 'prev.png']);
    mcpStep('px_render', { file: 'hero.px.json', out: 'prev.png' });

    const cliEnvelope = cliStep(['diff', '--file', 'hero.px.json', '--against', 'prev.png']);
    const { envelope } = mcpStep('px_diff', { file: 'hero.px.json', against: 'prev.png' });
    expect(envelope).toEqual(cliEnvelope);
    expect(envelope.identical).toBe(true);

    // Both paths agree on the hash-only shape too, warning included.
    const cliHash = cliStep([
      'diff',
      '--file',
      'hero.px.json',
      '--against',
      `sha256:${'b'.repeat(64)}`,
    ]);
    const hash = mcpStep('px_diff', {
      file: 'hero.px.json',
      against: `sha256:${'b'.repeat(64)}`,
    });
    expect(hash.envelope).toEqual(cliHash);
  });

  it('fails the same way in both paths', () => {
    for (const step of steps) {
      cliStep(step.cli);
      mcpStep(step.tool, step.params);
    }

    let raw = '';
    const cliCode = runCli(['draw', '--file', 'hero.px.json', '--layer', 'nope', '--ops', '[]'], {
      cwd: cliDir,
      stdout: (text) => {
        raw += text;
      },
      stderr: () => undefined,
    });
    const cliEnvelope = JSON.parse(raw) as Envelope;

    const result = callTool(
      'px_draw',
      { file: 'hero.px.json', layer: 'nope', ops: [] },
      { cwd: mcpDir },
    );
    expect(result.isError).toBe(true);
    const blocks = result.content as TextBlock[];
    const mcpEnvelope = JSON.parse(blocks[0]?.text ?? '{}') as Envelope;

    expect(cliCode).toBe(1);
    expect(cliEnvelope.ok).toBe(false);
    expect(mcpEnvelope).toEqual(cliEnvelope);
    expect((mcpEnvelope.error as { code: string }).code).toBe('E_NO_SUCH_LAYER');
  });
});

/**
 * FR-1, FR-2, FR-5: parts and an explicit-role palette are authorable through
 * either surface. Before phase R1 only `px_draw` could mention `part`, and only
 * by hand-editing the recipe, so a tool-only agent could not reach any of the
 * part-scoped art codes at all.
 */
const ROLE_PALETTE = {
  steel: {
    ramp: { outline: '#101010', shadow: '#303030', base: '#808080', highlight: '#c0c0c0' },
  },
  ember: {
    ramp: { outline: '#2a0d0d', shadow: '#7a2418', base: '#c2452a', highlight: '#ef8a4a' },
  },
};

const PARTS = {
  blade: { material: 'steel', gloss: 'metal', z: 1 },
  grip: { material: 'ember', gloss: 'cloth' },
};

const PART_OPS = [
  { op: 'rect', x: 4, y: 4, w: 14, h: 4, color: 'steel.base', part: 'blade' },
  { op: 'rect', x: 8, y: 8, w: 6, h: 10, color: 'ember.base', part: 'grip' },
  { op: 'light', angle: 'top-left', form: 'round', ao: true, rim: 'edge' },
];

describe('parts and explicit-role palettes through both surfaces', () => {
  it('declares parts, draws them and lights them identically', () => {
    const paletteArg = JSON.stringify(ROLE_PALETTE);
    const partsArg = JSON.stringify(PARTS);
    const cliInit = cliStep([
      'init',
      '--file',
      'parts.px.json',
      '--width',
      '24',
      '--height',
      '24',
      '--palette',
      paletteArg,
      '--parts',
      partsArg,
      '--profile',
      'small',
    ]);
    const mcpInit = mcpStep('px_init', {
      file: 'parts.px.json',
      width: 24,
      height: 24,
      palette: ROLE_PALETTE,
      parts: PARTS,
      profile: 'small',
    }).envelope;
    expect(mcpInit).toEqual(cliInit);
    expect(cliInit.parts).toEqual(['blade', 'grip']);

    const cliDraw = cliStep(['draw', '--file', 'parts.px.json', '--ops', JSON.stringify(PART_OPS)]);
    const mcpDraw = mcpStep('px_draw', { file: 'parts.px.json', ops: PART_OPS }).envelope;
    expect(mcpDraw).toEqual(cliDraw);

    const cliValidate = cliStep(['validate', '--file', 'parts.px.json']);
    const mcpValidate = mcpStep('px_validate', { file: 'parts.px.json' }).envelope;
    expect(mcpValidate).toEqual(cliValidate);

    // The parts are really there: inspect reports both, with their bounds.
    const cliInspect = cliStep(['inspect', '--file', 'parts.px.json', '--region', '0,0,24,24']);
    const mcpInspect = mcpStep('px_inspect', {
      file: 'parts.px.json',
      regions: ['0,0,24,24'],
    }).envelope;
    expect(mcpInspect).toEqual(cliInspect);
    expect((cliInspect.parts as unknown[]).length).toBe(2);

    expect(bytes(cliDir, 'parts.px.json').toString()).toBe(
      bytes(mcpDir, 'parts.px.json').toString(),
    );
  });
});
