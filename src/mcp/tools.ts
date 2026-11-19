/**
 * MCP tool surface (FR-22).
 *
 * Every tool is a thin adapter over the CLI: it turns its parameters into the
 * argv `px` already accepts, runs `runCli` in this process, and returns the
 * envelope verbatim. That is the whole parity argument (P6.T2.2) — there is one
 * implementation of every verb, and the transport only decides how the envelope
 * travels.
 *
 * Diagnostics never go to stdout: stdout carries protocol frames only.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SUBJECTS } from '../brief/index.js';
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
  'px_fix',
  'px_anchor',
  'px_inspect',
  'px_validate',
  'px_render',
  'px_diff',
  'px_brief',
  'px_critique',
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
    name: 'px_brief',
    description:
      'Plan a subject before drawing. Returns parts with proportion ranges, a hero part and a 1-5 value hierarchy, plus a paste-ready 1.2 design block. Local templates only; writes no recipe and no PNG.',
    inputSchema: schema(
      {
        subject: {
          type: 'string',
          enum: [...SUBJECTS],
          description: 'The built-in subject to plan.',
        },
        size: {
          type: 'integer',
          minimum: 8,
          maximum: 256,
          default: 32,
          description: 'Square canvas size the proportion ranges are scaled against.',
        },
        strict: STRICT,
      },
      ['subject'],
    ),
  },
  {
    name: 'px_critique',
    description:
      'Rank the gaps between the declared design intent and the compiled sprite. Returns intended vs observed for each criterion with a concrete, applyable fix per finding. Diagnostic proxies only; no vision and no network. Writes nothing and remembers no streak.',
    inputSchema: schema(
      {
        file: FILE,
        streak: {
          type: 'integer',
          minimum: 0,
          description: 'Caller-supplied count of unchanged calls; signal at 4 or more.',
        },
        previous: {
          type: 'string',
          description: 'Fingerprint from the previous critique; must match the current one.',
        },
        strict: STRICT,
      },
      ['file'],
    ),
  },
  {
    name: 'px_fix',
    description:
      'Apply one ranked critique fix by its zero-based finding index, append the complete op to its layer and re-render. Pass the digest from the critique to reject stale findings (E_FIX_STALE); an applied op with no visible change reports W_FIX_NOOP.',
    inputSchema: schema(
      {
        file: FILE,
        finding: {
          type: 'integer',
          minimum: 0,
          description: 'Zero-based index of the finding to apply from px critique.',
        },
        sha256: {
          type: 'string',
          description: 'Digest from the critique envelope; a mismatch reports E_FIX_STALE.',
        },
        strict: STRICT,
      },
      ['file', 'finding'],
    ),
  },
  {
    name: 'px_init',
    description:
      'Create a recipe with a palette, one layer, and a centred pivot anchor. Declare parts here if you intend to tag ops with "part": an op naming a part that is not declared raises E_PART_UNKNOWN.',
    inputSchema: schema(
      {
        file: FILE,
        name: { type: 'string' },
        width: { type: 'integer', minimum: 8, maximum: 256 },
        height: { type: 'integer', minimum: 8, maximum: 256 },
        palette: {
          description:
            'Comma-separated hex colours, an array of hex strings, or an object of families with explicit roles: {"steel": {"ramp": {"shadow": "#303030", "base": "#808080", "highlight": "#c0c0c0"}}} or {"leaf": {"colors": ["#1a1c2c", "#4a8f3c"]}}.',
          anyOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
            { type: 'object' },
          ],
        },
        parts: {
          description:
            'Parts to declare, as an inline object or a path to a JSON file: {"blade": {"material": "steel", "gloss": "metal", "z": 1}, "wall": {"material": "stone", "facing": "right"}}. Each material must name a palette family; "facing" names the plane the part looks at (front, back, left, right, top, bottom) or gives a unit [x, y, z] vector, and makes "light" shade it per plane.',
          anyOf: [{ type: 'object' }, { type: 'string' }],
        },
        design: {
          description:
            'Authoritative design intent, as an inline object or a path to a JSON file. It declares subject, light, hierarchy, values (1-5 per part), edges (silhouette, material, detail), materials and style ("@project" inherits px.style.json). Declaring it writes schema 1.2.',
          anyOf: [{ type: 'object' }, { type: 'string' }],
        },
        profile: {
          type: 'string',
          description:
            'Scale profile written to meta.profile: tiny, small, medium or large. It should agree with the canvas size; a contradicting override reports W_PROFILE_MISMATCH. Omit it to derive the profile from the canvas.',
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
    description:
      'Append ops to a layer and report the op index map. Ops may carry "part": "<name>" to claim pixels for a declared part; an undeclared name raises E_PART_UNKNOWN.',
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
      'Replace one op by id or index with one or more new ops. The response reports the zero-based replaced_index of the address that was replaced. Replacement ops may carry "part": "<name>" to claim pixels for a declared part; an undeclared name raises E_PART_UNKNOWN.',
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
    description:
      'Write the 1x PNG and return it, with findings and optional metadata. With export=true on a framed recipe (version 1.4 with frames), also writes a single-row <stem>.sheet.png and an additive <stem>.sheet.meta.json beside the normal PNG; the normal PNG stays frame 0 and is unchanged. With --onion <index> on a framed recipe, writes a sibling <stem>.onion<index>.png prev/selected/next strip instead; the normal PNG stays frame 0 and is unchanged.',
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
        blockout: {
          type: 'boolean',
          default: false,
          description:
            'Judgement view: three flat value bands (highlight/base/shadow) per part from the compiled sprite. No outline, AO or texture. Writes a sibling PNG, never --out; cannot combine with debug, export or values.',
        },
        values: {
          type: 'integer',
          minimum: 2,
          maximum: 8,
          description:
            'Judgement view: posterise the render into this many grey steps by fixed relative-luma mapping. Writes a sibling PNG, never --out; cannot combine with debug, export or blockout.',
        },
        onion: {
          type: 'integer',
          minimum: 0,
          description:
            'Judgement view selected by --onion <index>: three full-canvas panels showing the previous, selected and next frames side by side, with out-of-range panels transparent. Writes a sibling PNG, never --out; needs a framed recipe; cannot combine with debug, export, blockout or values.',
        },
        strict: STRICT,
      },
      ['file', 'out'],
    ),
  },
  {
    name: 'px_diff',
    description:
      'Render a recipe and compare it with a previous PNG or a sha256 ref: reports identical, changed count, bounding box and per-part breakdown. A 1x1 bounding box is the changed coordinate itself. A hash can prove difference but not locate it.',
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

/**
 * A palette is a hex list, an array of hex strings, or an object of families with
 * explicit roles. The CLI parses the object form from the same JSON text.
 */
function paletteArg(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  return Array.isArray(value)
    ? value.map((entry) => String(entry)).join(',')
    : JSON.stringify(value);
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
    case 'px_brief': {
      argv.push('brief');
      flag(argv, 'subject', str(params.subject));
      flag(argv, 'size', str(params.size));
      break;
    }
    case 'px_critique': {
      argv.push('critique');
      flag(argv, 'file', file);
      flag(argv, 'streak', str(params.streak));
      flag(argv, 'previous', str(params.previous));
      break;
    }
    case 'px_fix': {
      argv.push('fix');
      flag(argv, 'file', file);
      flag(argv, 'finding', str(params.finding));
      flag(argv, 'sha256', str(params.sha256));
      break;
    }
    case 'px_init': {
      argv.push('init');
      flag(argv, 'file', file);
      flag(argv, 'name', str(params.name));
      flag(argv, 'width', str(params.width));
      flag(argv, 'height', str(params.height));
      flag(argv, 'palette', paletteArg(params.palette));
      flag(argv, 'parts', opsArg(params.parts));
      flag(argv, 'design', opsArg(params.design));
      flag(argv, 'profile', str(params.profile));
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
      booleanFlag(argv, 'blockout', params.blockout);
      flag(argv, 'values', str(params.values));
      flag(argv, 'onion', str(params.onion));
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
    // View modes write a sibling PNG, so the envelope is the authority: a tool
    // client must receive the image it actually asked for, not the normal out.
    const out = str(envelope.out) ?? str(params.out);
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
