/**
 * CLI entry logic. Kept free of process globals so the integration layer can
 * drive it in-process with a temporary working directory.
 */

import { internalError, isUsageError, PxError } from '../core/errors.js';
import { probeRuntime } from '../probe.js';
import { COMMANDS, type ParsedArgs, parseArgs } from './args.js';
import { runDraw, runInit, runInspect, runRender } from './commands.js';
import { EXIT_ERROR, EXIT_OK, EXIT_USAGE, failureEnvelope, successEnvelope } from './envelope.js';

export interface CliIo {
  cwd: string;
  stdout(text: string): void;
  stderr(text: string): void;
}

function helpPayload(): Record<string, unknown> {
  return {
    usage: [
      'px init --file <path> [--name <name>] [--width n] [--height n] [--palette hex,hex,...] [--force]',
      'px draw --file <path> [--layer <id>] --ops <json-array> [--out <path>]',
      'px inspect --file <path> [--region x,y,w,h]',
      'px render --file <path> --out <png>',
    ],
    commands: COMMANDS,
    flags: ['--pretty', '--color', '--force', '--help'],
    exit_codes: {
      '0': 'success',
      '1': 'caller error',
      '2': 'usage error',
      '3': 'lint gate (reserved)',
    },
    runtime: probeRuntime(),
  };
}

function dispatch(command: string, args: ParsedArgs, cwd: string): Record<string, unknown> {
  switch (command) {
    case 'init':
      return runInit(args, cwd);
    case 'draw':
      return runDraw(args, cwd);
    case 'inspect':
      return runInspect(args, cwd);
    case 'render':
      return runRender(args, cwd);
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
    io.stdout(successEnvelope(parsed.command, payload, parsed.pretty));
    return EXIT_OK;
  } catch (cause) {
    const error = cause instanceof PxError ? cause : internalError(cause);
    const command = parsed?.command ?? '';
    const pretty = parsed?.pretty ?? argv.includes('--pretty');
    io.stdout(failureEnvelope(command, error, pretty));
    return isUsageError(error) ? EXIT_USAGE : EXIT_ERROR;
  }
}
