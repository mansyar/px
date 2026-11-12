/**
 * CLI entry logic. Kept free of process globals so the integration layer can
 * drive it in-process with a temporary working directory.
 */

import { internalError, isInternalError, PxError } from '../core/errors.js';
import { lintBlocks } from '../lint/index.js';
import type { LintFinding } from '../lint/types.js';
import { probeRuntime } from '../probe.js';
import { COMMANDS, type ParsedArgs, parseArgs } from './args.js';
import {
  runAnchor,
  runDraw,
  runEdit,
  runInit,
  runInspect,
  runRender,
  runSynthesize,
  runValidate,
} from './commands.js';
import {
  EXIT_CALLER,
  EXIT_INTERNAL,
  EXIT_LINT,
  EXIT_OK,
  failureEnvelope,
  gateEnvelope,
  successEnvelope,
} from './envelope.js';

export interface CliIo {
  cwd: string;
  stdout(text: string): void;
  stderr(text: string): void;
}

function helpPayload(): Record<string, unknown> {
  return {
    usage: [
      'px init --file <path> [--name <name>] [--width n] [--height n] [--palette hex,hex,...|name] [--derive-ramps] [--synthesize name=#hex:steps]... [--force]',
      'px draw --file <path> [--layer <id>] --ops <json-array> [--out <path>]',
      'px edit --file <path> [--layer <id>] (--id <op-id> | --op-index n) --ops <json-array> [--out <path>]',
      'px anchor --file <path> --name <anchor> --x n --y n [--out <path>]',
      'px inspect --file <path> [--region x,y,w,h]... [--summary]',
      'px render --file <path> --out <png> [--swap from=to]... [--debug [--backdrop hex|null]] [--export]',
      'px synthesize --file <path> --family <name> --from <hex> --steps n [--force]',
      'px validate --file <path>',
    ],
    commands: COMMANDS,
    flags: [
      '--pretty',
      '--color',
      '--force',
      '--help',
      '--debug',
      '--strict',
      '--export',
      '--summary',
      '--derive-ramps',
      '--backdrop',
      '--family',
      '--from',
      '--steps',
      '--synthesize',
      '--swap',
    ],
    exit_codes: {
      '0': 'success',
      '1': 'caller error',
      '2': 'internal error',
      '3': 'lint gate under --strict',
    },
    runtime: probeRuntime(),
  };
}

/**
 * Findings the strict gate reads. `render` and `validate` are the only writers
 * of this key, and they always write a LintFinding array.
 */
function payloadFindings(payload: Record<string, unknown>): LintFinding[] {
  const value = payload.findings;
  return Array.isArray(value) ? (value as LintFinding[]) : [];
}

function dispatch(command: string, args: ParsedArgs, cwd: string): Record<string, unknown> {
  switch (command) {
    case 'init':
      return runInit(args, cwd);
    case 'draw':
      return runDraw(args, cwd);
    case 'edit':
      return runEdit(args, cwd);
    case 'anchor':
      return runAnchor(args, cwd);
    case 'inspect':
      return runInspect(args, cwd);
    case 'render':
      return runRender(args, cwd);
    case 'synthesize':
      return runSynthesize(args, cwd);
    case 'validate':
      return runValidate(args, cwd);
    default:
      throw new PxError(
        'E_USAGE',
        `Unknown command "${command}"`,
        `Commands are ${COMMANDS.join(', ')}.`,
      );
  }
}

export function runCli(argv: readonly string[], io: CliIo): number {
  let parsed: ParsedArgs | undefined;
  try {
    parsed = parseArgs(argv);
    if (parsed.help || parsed.command === '') {
      io.stdout(successEnvelope('help', helpPayload(), parsed.pretty));
      return EXIT_OK;
    }
    const payload = dispatch(parsed.command, parsed, io.cwd);
    const findings = payloadFindings(payload);
    if (parsed.strict && lintBlocks(findings, true)) {
      const blocking = findings.filter((finding) => finding.severity !== 'info').length;
      const error = new PxError(
        'E_LINT_GATE',
        `${blocking} lint finding${blocking === 1 ? '' : 's'} block under --strict`,
      );
      io.stdout(gateEnvelope(parsed.command, error, payload, parsed.pretty));
      return EXIT_LINT;
    }
    io.stdout(successEnvelope(parsed.command, payload, parsed.pretty));
    return EXIT_OK;
  } catch (cause) {
    const error = cause instanceof PxError ? cause : internalError(cause);
    const command = parsed?.command ?? '';
    const pretty = parsed?.pretty ?? argv.includes('--pretty');
    io.stdout(failureEnvelope(command, error, pretty));
    return isInternalError(error) ? EXIT_INTERNAL : EXIT_CALLER;
  }
}
