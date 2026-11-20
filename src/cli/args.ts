/**
 * Hand-rolled argument parsing. No CLI framework, and every failure is an
 * E_USAGE with the accepted shape of the command.
 */

import { PxError } from '../core/errors.js';

export interface ParsedArgs {
  command: string;
  /** Brief subject, from the second positional or from --subject. */
  subject?: string;
  /** Frame verb subcommand, from the second positional. */
  frameCommand?: string;
  /** Frame target for the frame verb: a logical index or an exact frame id. */
  frame?: string;
  /** Zero-based destination inside the declared frames, for `frame move`. */
  to?: string;
  /** Frame duration in milliseconds; omitting it clears the duration. */
  duration?: string;
  replace: boolean;
  size?: string;
  /** Render-view selectors. These are not verbs: they only change the PNG. */
  blockout: boolean;
  values?: string;
  /** Zero-based frame index for the onion neighbor-strip view. */
  onion?: string;
  file?: string;
  layer?: string;
  ops?: string;
  regions: string[];
  summary: boolean;
  out?: string;
  /** Zero-based index of the critique finding `px fix` should apply. */
  finding?: string;
  /** Digest from the critique envelope; mismatches report E_FIX_STALE. */
  sha256?: string;
  /** Caller-supplied unchanged-call count; critique retains no streak state. */
  streak?: string;
  /** Caller-supplied fingerprint from the previous critique in the sequence. */
  previous?: string;
  name?: string;
  width?: string;
  height?: string;
  palette?: string;
  parts?: string;
  design?: string;
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
  'frame',
  'anchor',
  'inspect',
  'render',
  'diff',
  'synthesize',
  'validate',
  'brief',
  'critique',
  'fix',
];

function usageError(message: string, hint: string): PxError {
  return new PxError('E_USAGE', message, hint);
}

/** Every flag that consumes the following argv token. */
export const VALUE_FLAGS: readonly string[] = [
  'subject',
  'size',
  'values',
  'onion',
  'frame',
  'to',
  'duration',
  'file',
  'layer',
  'ops',
  'region',
  'out',
  'finding',
  'sha256',
  'streak',
  'previous',
  'name',
  'width',
  'height',
  'palette',
  'parts',
  'design',
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
  'blockout',
  'pretty',
  'force',
  'help',
  'color',
  'debug',
  'strict',
  'export',
  'summary',
  'replace',
  'derive-ramps',
];

function setValueFlag(parsed: ParsedArgs, name: string, value: string): void {
  switch (name) {
    case 'subject':
      parsed.subject = value;
      return;
    case 'size':
      parsed.size = value;
      return;
    case 'values':
      parsed.values = value;
      return;
    case 'onion':
      parsed.onion = value;
      return;
    case 'frame':
      parsed.frame = value;
      return;
    case 'to':
      parsed.to = value;
      return;
    case 'duration':
      parsed.duration = value;
      return;
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
    case 'finding':
      parsed.finding = value;
      return;
    case 'sha256':
      parsed.sha256 = value;
      return;
    case 'streak':
      parsed.streak = value;
      return;
    case 'previous':
      parsed.previous = value;
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
    case 'design':
      parsed.design = value;
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
        'Flags that take a value are --subject, --size, --values, --onion, --frame, --to, --duration, --file, --layer, --ops, --region, --out, --finding, --sha256, --streak, --previous, --name, --width, --height, --palette, --parts, --design, --profile, --id, --op-index, --x, --y, --backdrop, --against, --family, --from, --steps, --synthesize, --swap.',
      );
  }
}

function setBooleanFlag(parsed: ParsedArgs, name: string): void {
  switch (name) {
    case 'blockout':
      parsed.blockout = true;
      return;
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
    case 'replace':
      parsed.replace = true;
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
    blockout: false,
    regions: [],
    summary: false,
    synthesize: [],
    swap: [],
    pretty: false,
    force: false,
    replace: false,
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

  const command = positionals[0] ?? '';
  // `brief` takes a subject and `frame` takes a subcommand as their second
  // positional. Every other verb keeps the one-positional shape its callers rely on.
  const takesSecondPositional = command === 'brief' || command === 'frame';
  if (positionals.length > 2 || (positionals.length > 1 && !takesSecondPositional)) {
    throw usageError(
      `Unexpected argument "${positionals[positionals.length - 1] ?? ''}"`,
      `px takes one command: ${COMMANDS.join(', ')}.`,
    );
  }
  parsed.command = command;
  if (positionals[1] !== undefined) {
    if (command === 'brief') {
      parsed.subject = positionals[1];
    } else if (command === 'frame') {
      parsed.frameCommand = positionals[1];
    }
  }
  return parsed;
}
