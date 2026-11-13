/**
 * Hand-rolled argument parsing. No CLI framework, and every failure is an
 * E_USAGE with the accepted shape of the command.
 */

import { PxError } from '../core/errors.js';

export interface ParsedArgs {
  command: string;
  file?: string;
  layer?: string;
  ops?: string;
  regions: string[];
  summary: boolean;
  out?: string;
  name?: string;
  width?: string;
  height?: string;
  palette?: string;
  parts?: string;
  profile?: string;
  id?: string;
  opIndex?: string;
  x?: string;
  y?: string;
  backdrop?: string;
  against?: string;
  family?: string;
  from?: string;
  steps?: string;
  synthesize: string[];
  swap: string[];
  pretty: boolean;
  force: boolean;
  help: boolean;
  debug: boolean;
  strict: boolean;
  metaExport: boolean;
  deriveRamps: boolean;
}

export const COMMANDS: readonly string[] = [
  'init',
  'draw',
  'edit',
  'anchor',
  'inspect',
  'render',
  'diff',
  'synthesize',
  'validate',
];

function usageError(message: string, hint: string): PxError {
  return new PxError('E_USAGE', message, hint);
}

/** Every flag that consumes the following argv token. */
export const VALUE_FLAGS: readonly string[] = [
  'file',
  'layer',
  'ops',
  'region',
  'out',
  'name',
  'width',
  'height',
  'palette',
  'parts',
  'profile',
  'id',
  'op-index',
  'x',
  'y',
  'backdrop',
  'against',
  'family',
  'from',
  'steps',
  'synthesize',
  'swap',
];

/** Every flag that is a bare switch. */
export const BOOLEAN_FLAGS: readonly string[] = [
  'pretty',
  'force',
  'help',
  'color',
  'debug',
  'strict',
  'export',
  'summary',
  'derive-ramps',
];

function setValueFlag(parsed: ParsedArgs, name: string, value: string): void {
  switch (name) {
    case 'file':
      parsed.file = value;
      return;
    case 'layer':
      parsed.layer = value;
      return;
    case 'ops':
      parsed.ops = value;
      return;
    case 'region':
      parsed.regions.push(value);
      return;
    case 'out':
      parsed.out = value;
      return;
    case 'name':
      parsed.name = value;
      return;
    case 'width':
      parsed.width = value;
      return;
    case 'height':
      parsed.height = value;
      return;
    case 'palette':
      parsed.palette = value;
      return;
    case 'parts':
      parsed.parts = value;
      return;
    case 'profile':
      parsed.profile = value;
      return;
    case 'id':
      parsed.id = value;
      return;
    case 'op-index':
      parsed.opIndex = value;
      return;
    case 'x':
      parsed.x = value;
      return;
    case 'y':
      parsed.y = value;
      return;
    case 'backdrop':
      parsed.backdrop = value;
      return;
    case 'against':
      parsed.against = value;
      return;
    case 'family':
      parsed.family = value;
      return;
    case 'from':
      parsed.from = value;
      return;
    case 'steps':
      parsed.steps = value;
      return;
    case 'synthesize':
      parsed.synthesize.push(value);
      return;
    case 'swap':
      parsed.swap.push(value);
      return;
    default:
      throw usageError(
        `Unknown flag --${name}`,
        'Flags that take a value are --file, --layer, --ops, --region, --out, --name, --width, --height, --palette, --parts, --profile, --id, --op-index, --x, --y, --backdrop, --against, --family, --from, --steps, --synthesize, --swap.',
      );
  }
}

function setBooleanFlag(parsed: ParsedArgs, name: string): void {
  switch (name) {
    case 'pretty':
      parsed.pretty = true;
      return;
    case 'force':
      parsed.force = true;
      return;
    case 'help':
      parsed.help = true;
      return;
    case 'debug':
      parsed.debug = true;
      return;
    case 'strict':
      parsed.strict = true;
      return;
    case 'export':
      parsed.metaExport = true;
      return;
    case 'summary':
      parsed.summary = true;
      return;
    case 'derive-ramps':
      parsed.deriveRamps = true;
      return;
    // Accepted for interface parity; px never emits ANSI unless asked, and
    // Phase 1 has no coloured output to emit.
    case 'color':
      return;
    default:
      throw usageError(`Unknown flag --${name}`, 'Run `px --help` for the accepted flags.');
  }
}

function isBooleanFlag(name: string): boolean {
  return BOOLEAN_FLAGS.includes(name);
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    command: '',
    regions: [],
    summary: false,
    synthesize: [],
    swap: [],
    pretty: false,
    force: false,
    help: false,
    debug: false,
    strict: false,
    metaExport: false,
    deriveRamps: false,
  };
  const positionals: string[] = [];
  let index = 0;

  while (index < argv.length) {
    const token = argv[index];
    if (token === undefined) {
      break;
    }
    if (token === '-h' || token === '--help') {
      parsed.help = true;
      index += 1;
      continue;
    }
    if (token.startsWith('--')) {
      const body = token.slice(2);
      const equals = body.indexOf('=');
      const name = equals === -1 ? body : body.slice(0, equals);
      const inline = equals === -1 ? undefined : body.slice(equals + 1);
      if (isBooleanFlag(name)) {
        if (inline !== undefined) {
          throw usageError(`--${name} takes no value`, `Write --${name} on its own.`);
        }
        setBooleanFlag(parsed, name);
        index += 1;
        continue;
      }
      const value = inline ?? argv[index + 1];
      if (value === undefined) {
        throw usageError(`--${name} requires a value`, `Write --${name} <value>.`);
      }
      setValueFlag(parsed, name, value);
      index += inline === undefined ? 2 : 1;
      continue;
    }
    positionals.push(token);
    index += 1;
  }

  if (positionals.length > 1) {
    throw usageError(
      `Unexpected argument "${positionals[1]}"`,
      `px takes one command: ${COMMANDS.join(', ')}.`,
    );
  }
  parsed.command = positionals[0] ?? '';
  return parsed;
}
