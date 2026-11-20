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
  runBrief,
  runCritique,
  runDiff,
  runDraw,
  runEdit,
  runFix,
  runFrame,
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
      'px init --file <path> [--name <name>] [--width n] [--height n] [--palette hex,hex,...|name|json-object] [--parts json-or-file] [--design json-or-file] [--profile name] [--derive-ramps] [--synthesize name=#hex:steps]... [--force]',
      'px draw --file <path> [--layer <id>] --ops <json-array> [--out <path>]',
      'px edit --file <path> [--layer <id>] (--id <op-id> | --op-index n) --ops <json-array> [--out <path>]',
      'px frame add --file <path> (--from <index|id> | --ops <json-array>) [--id <id>] [--duration n] [--layer <id>] [--out <path>]  # --ops wins over --from when both are given',
      'px frame edit --file <path> --frame <index|id> [--layer <id>] (--op-index n | --replace) --ops <json-array> [--out <path>]',
      'px frame remove --file <path> --frame <index|id> [--out <path>]  # frame 0 cannot be removed',
      'px frame list --file <path>  # one row per frame, including frame 0',
      'px frame set-duration --file <path> --frame <index|id> [--duration n] [--out <path>]  # omit --duration to clear',
      'px frame move --file <path> --frame <index|id> --to <index> [--out <path>]  # --to is zero-based within the declared frames',
      'px anchor --file <path> --name <anchor> --x n --y n [--out <path>]',
      'px inspect --file <path> [--region x,y,w,h]... [--summary]',
      'px render --file <path> --out <png> [--swap from=to]... [--debug [--backdrop hex|null]] [--export] [--blockout | --values n | --onion <index>]  # --export on a framed recipe also writes <stem>.sheet.png + <stem>.sheet.meta.json (with an additive timeline); views write a sibling PNG, never --out',
      'px diff --file <path> --against <png|sha256:hex> [--out <png>]',
      'px synthesize --file <path> --family <name> --from <hex> --steps n [--force]',
      'px validate --file <path>',
      'px brief <subject> --size n  # subject: character, prop or scene; writes nothing',
      'px critique --file <path> [--streak n --previous <64-hex>]  # read-only ranked gap report',
      'px fix --file <path> --finding n [--sha256 <digest>]  # apply finding n (zero-based) and re-render',
    ],
    commands: COMMANDS,
    flags: [
      '--subject',
      '--size',
      '--values',
      '--onion',
      '--frame',
      '--to',
      '--duration',
      '--replace',
      '--blockout',
      '--pretty',
      '--color',
      '--force',
      '--help',
      '--debug',
      '--strict',
      '--export',
      '--summary',
      '--derive-ramps',
      '--parts',
      '--design',
      '--profile',
      '--backdrop',
      '--against',
      '--family',
      '--from',
      '--steps',
      '--synthesize',
      '--swap',
      '--finding',
      '--sha256',
      '--streak',
      '--previous',
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
 * Findings the strict gate reads. `render` and `validate` write LintFinding
 * arrays under this key; `critique` and `fix` write ranked gap findings, which
 * are feedback, not lint, and must not trip the lint gate.
 */
function payloadFindings(payload: Record<string, unknown>, command: string): LintFinding[] {
  if (command === 'critique' || command === 'fix') {
    return [];
  }
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
    case 'frame':
      return runFrame(args, cwd);
    case 'anchor':
      return runAnchor(args, cwd);
    case 'inspect':
      return runInspect(args, cwd);
    case 'render':
      return runRender(args, cwd);
    case 'diff':
      return runDiff(args, cwd);
    case 'synthesize':
      return runSynthesize(args, cwd);
    case 'validate':
      return runValidate(args, cwd);
    case 'brief':
      return runBrief(args, cwd);
    case 'critique':
      return runCritique(args, cwd);
    case 'fix':
      return runFix(args, cwd);
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
    const findings = payloadFindings(payload, parsed.command);
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
