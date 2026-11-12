/**
 * MCP tool surface (FR-22).
 *
 * Every tool is a thin adapter over the CLI: it turns its parameters into the
 * argv `px` already accepts, runs `runCli` in this process, and returns the
 * envelope verbatim. That is the whole parity argument (AC-19) — there is one
 * implementation of every verb, and the transport only decides how the envelope
 * travels.
 *
 * Diagnostics never go to stdout: stdout carries protocol frames only.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { runCli } from '../cli/main.js';

export type Params = Record<string, unknown>;

export interface ImageBlock {
  type: 'image';
  data: string;
  mimeType: 'image/png';
}

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolResult {
  content: Array<TextBlock | ImageBlock>;
  isError?: boolean;
  [key: string]: unknown;
}

export const MCP_TOOLS: readonly string[] = [
  'px_init',
  'px_draw',
  'px_edit',
  'px_anchor',
  'px_inspect',
  'px_validate',
  'px_render',
  'px_diff',
];

const STRICT = {
  type: 'boolean',
  description: 'Fail the call when a lint finding blocks; defaults to false.',
  default: false,
} as const;

const FILE = { type: 'string', description: 'Recipe path, resolved against the server cwd.' };

function schema(properties: Record<string, unknown>, required: string[]): Tool['inputSchema'] {
  return { type: 'object', properties, required } as Tool['inputSchema'];
}

export const TOOL_DEFINITIONS: Tool[] = [
  {
    name: 'px_init',
    description: 'Create a recipe with a palette, one layer, and a centred pivot anchor.',
    inputSchema: schema(
      {
        file: FILE,
        name: { type: 'string' },
        width: { type: 'integer', minimum: 8, maximum: 256 },
        height: { type: 'integer', minimum: 8, maximum: 256 },
        palette: {
          description: 'Comma-separated hex colours, or an array of hex strings.',
          anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        },
        derive_ramps: {
          type: 'boolean',
          description:
            'Lift shadow/highlight/outline roles from a flat palette by luminance. Without it a flat palette has positional slots only, and the ramp-dependent ops cannot be used.',
          default: false,
        },
        force: { type: 'boolean', default: false },
        synthesize: {
          description:
            'Ramp families to synthesise, as name=#hex:steps entries (3-6 steps), an array or a comma-separated string. Steps are written as explicit tones t0..t(n-1).',
          anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }],
        },
        strict: STRICT,
      },
      ['file'],
    ),
  },
  {
    name: 'px_draw',
    description: 'Append ops to a layer and report the op index map.',
    inputSchema: schema(
      {
        file: FILE,
        layer: { type: 'string' },
        ops: {
          description: 'Op objects or compact tuples, as an array or a JSON string.',
          anyOf: [{ type: 'array' }, { type: 'string' }],
        },
        out: { type: 'string' },
        strict: STRICT,
      },
      ['file', 'ops'],
    ),
  },
  {
    name: 'px_edit',
    description:
      'Replace one op by id or index with one or more new ops. The response reports the zero-based replaced_index of the address that was replaced.',
    inputSchema: schema(
      {
        file: FILE,
        layer: { type: 'string' },
        id: { type: 'string' },
        op_index: { type: 'integer' },
        ops: {
          description: 'Replacement ops, as an array or a JSON string.',
          anyOf: [{ type: 'array' }, { type: 'string' }],
        },
        out: { type: 'string' },
        strict: STRICT,
      },
      ['file', 'ops'],
    ),
  },
  {
    name: 'px_anchor',
    description: 'Set or move one named anchor, in canvas coordinates.',
    inputSchema: schema(
      {
        file: FILE,
        name: { type: 'string' },
        x: { type: 'integer' },
        y: { type: 'integer' },
        out: { type: 'string' },
        strict: STRICT,
      },
      ['file', 'name', 'x', 'y'],
    ),
  },
  {
    name: 'px_inspect',
    description: 'Return ASCII matrices for every requested region plus a role-code legend.',
    inputSchema: schema(
      {
        file: FILE,
        regions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Each entry is x,y,w,h. Omit for the full-canvas summary.',
        },
        summary: { type: 'boolean', default: false },
        strict: STRICT,
      },
      ['file'],
    ),
  },
  {
    name: 'px_validate',
    description:
      'Lint a recipe without writing a PNG: returns findings, trim bounds, and warnings.',
    inputSchema: schema(
      {
        file: FILE,
        strict: STRICT,
      },
      ['file'],
    ),
  },
  {
    name: 'px_render',
    description: 'Write the 1x PNG and return it, with findings and optional metadata.',
    inputSchema: schema(
      {
        file: FILE,
        out: { type: 'string' },
        debug: { type: 'boolean', default: false },
        backdrop: {
          type: ['string', 'null'],
          description:
            'Panel B backdrop: a #rrggbb hex colour, or null for a transparent panel. Requires debug.',
        },
        export: { type: 'boolean', default: false },
        swap: {
          description:
            'Family swaps as from=to entries, an array or a comma-separated string. Applied to the rendered palette and the exported manifest; the recipe file is untouched.',
          anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }],
        },
        strict: STRICT,
      },
      ['file', 'out'],
    ),
  },
  {
    name: 'px_diff',
    description:
      'Render a recipe and compare it with a previous PNG or a sha256 ref: reports identical, changed count, bounding box and per-part breakdown. A hash can prove difference but not locate it.',
    inputSchema: schema(
      {
        file: FILE,
        against: {
          type: 'string',
          description:
            'Path to a previous PNG, resolved against the server cwd, or a sha256:<64 hex digits> of a previous render.',
        },
        out: {
          type: 'string',
          description: 'Optional path for the current render, so the next diff has a baseline.',
        },
        strict: STRICT,
      },
      ['file', 'against'],
    ),
  },
];

function str(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return typeof value === 'string' ? value : String(value);
}

function flag(argv: string[], name: string, value: string | undefined): void {
  if (value !== undefined) {
    argv.push(`--${name}`, value);
  }
}

function booleanFlag(argv: string[], name: string, value: unknown): void {
  if (value === true) {
    argv.push(`--${name}`);
  }
}

/** Ops travel as JSON either way: the CLI parses one array, and so does the engine. */
function opsArg(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

/** A repeatable flag: an array of entries, or one comma-separated string. */
function repeatedFlag(argv: string[], name: string, value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = str(entry);
      if (text !== undefined && text !== '') {
        argv.push(`--${name}`, text);
      }
    }
    return;
  }
  const text = str(value);
  if (text === undefined) {
    return;
  }
  for (const entry of text.split(',')) {
    const trimmed = entry.trim();
    if (trimmed !== '') {
      argv.push(`--${name}`, trimmed);
    }
  }
}

export function argvFor(tool: string, params: Params): string[] {
  const argv: string[] = [];
  const file = str(params.file);
  const strict = params.strict === true;
  switch (tool) {
    case 'px_init': {
      argv.push('init');
      flag(argv, 'file', file);
      flag(argv, 'name', str(params.name));
      flag(argv, 'width', str(params.width));
      flag(argv, 'height', str(params.height));
      flag(argv, 'palette', str(params.palette));
      booleanFlag(argv, 'derive-ramps', params.derive_ramps);
      repeatedFlag(argv, 'synthesize', params.synthesize);
      booleanFlag(argv, 'force', params.force);
      break;
    }
    case 'px_draw': {
      argv.push('draw');
      flag(argv, 'file', file);
      flag(argv, 'layer', str(params.layer));
      flag(argv, 'ops', opsArg(params.ops));
      flag(argv, 'out', str(params.out));
      break;
    }
    case 'px_edit': {
      argv.push('edit');
      flag(argv, 'file', file);
      flag(argv, 'layer', str(params.layer));
      flag(argv, 'id', str(params.id));
      flag(argv, 'op-index', str(params.op_index));
      flag(argv, 'ops', opsArg(params.ops));
      flag(argv, 'out', str(params.out));
      break;
    }
    case 'px_anchor': {
      argv.push('anchor');
      flag(argv, 'file', file);
      flag(argv, 'name', str(params.name));
      flag(argv, 'x', str(params.x));
      flag(argv, 'y', str(params.y));
      flag(argv, 'out', str(params.out));
      break;
    }
    case 'px_inspect': {
      argv.push('inspect');
      flag(argv, 'file', file);
      const regions = params.regions;
      if (Array.isArray(regions)) {
        for (const region of regions) {
          const text = str(region);
          if (text !== undefined) {
            argv.push('--region', text);
          }
        }
      } else if (str(regions) !== undefined) {
        argv.push('--region', str(regions) ?? '');
      }
      booleanFlag(argv, 'summary', params.summary);
      break;
    }
    case 'px_validate': {
      argv.push('validate');
      flag(argv, 'file', file);
      break;
    }
    case 'px_render': {
      argv.push('render');
      flag(argv, 'file', file);
      flag(argv, 'out', str(params.out));
      booleanFlag(argv, 'debug', params.debug);
      if (params.backdrop === null) {
        flag(argv, 'backdrop', 'null');
      } else {
        flag(argv, 'backdrop', str(params.backdrop));
      }
      booleanFlag(argv, 'export', params.export);
      repeatedFlag(argv, 'swap', params.swap);
      break;
    }
    case 'px_diff': {
      argv.push('diff');
      flag(argv, 'file', file);
      flag(argv, 'against', str(params.against));
      flag(argv, 'out', str(params.out));
      break;
    }
    default:
      return argv;
  }
  if (strict) {
    argv.push('--strict');
  }
  return argv;
}

function pngBlock(path: string, cwd: string): ImageBlock | null {
  try {
    const bytes = readFileSync(resolve(cwd, path));
    return { type: 'image', data: Buffer.from(bytes).toString('base64'), mimeType: 'image/png' };
  } catch {
    return null;
  }
}

/**
 * Runs one tool and returns its MCP content blocks.
 *
 * `options.cwd` exists so the parity suite can point the in-process call at a
 * scratch workspace; the server itself always uses `process.cwd()`.
 */
export function callTool(tool: string, params: Params, options: { cwd?: string } = {}): ToolResult {
  const cwd = options.cwd ?? process.cwd();
  let text = '';
  const argv = argvFor(tool, params);
  runCli(argv, {
    cwd,
    stdout: (chunk) => {
      text += chunk;
    },
    stderr: () => undefined,
  });
  const envelope = JSON.parse(text.trim() === '' ? '{}' : text) as Record<string, unknown>;
  const content: Array<TextBlock | ImageBlock> = [{ type: 'text', text: text.trimEnd() }];

  if (tool === 'px_render' && envelope.ok === true) {
    const out = str(params.out);
    const sheet = pngBlock(out ?? '', cwd);
    if (sheet !== null) {
      content.push(sheet);
    }
    // The 8x debug sheet is opt-in: it is only read when debug was asked for.
    if (params.debug === true) {
      const debug = envelope.debug as { out?: string } | undefined;
      const debugSheet = debug?.out === undefined ? null : pngBlock(debug.out, cwd);
      if (debugSheet !== null) {
        content.push(debugSheet);
      }
    }
  }

  const result: ToolResult = { content };
  if (envelope.ok !== true) {
    result.isError = true;
  }
  return result;
}

const BY_NAME = new Set(TOOL_DEFINITIONS.map((tool) => tool.name));

export function isToolName(name: string): boolean {
  return BY_NAME.has(name);
}
