import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { PxError } from '../../src/core/errors.js';
import { parseStepCount, synthesizeRamp } from '../../src/palettes/synthesize.js';

let workspace = '';

function run(args: string[]): { code: number; envelope: Record<string, unknown> } {
  let raw = '';
  const code = runCli(args, {
    cwd: workspace,
    stdout: (text) => {
      raw += text;
    },
    stderr: () => undefined,
  });
  return { code, envelope: JSON.parse(raw) as Record<string, unknown> };
}

function errorOf(envelope: Record<string, unknown>): { code?: string; hint?: string } {
  return (envelope.error as { code?: string; hint?: string } | undefined) ?? {};
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-steps-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('ramp step bounds', () => {
  it('accepts the inclusive range 3-6', () => {
    for (const value of ['3', '4', '5', '6', 3, 6]) {
      expect(parseStepCount(value)).toBe(Number(value));
      expect(synthesizeRamp('#b13e53', Number(value))).toHaveLength(Number(value));
    }
  });

  it('rejects a count outside 3-6 with E_RAMP_STEPS_RANGE', () => {
    for (const value of ['2', '7', '0', 2, 7, 0]) {
      let caught: unknown;
      try {
        parseStepCount(value);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(PxError);
      expect((caught as PxError).code).toBe('E_RAMP_STEPS_RANGE');
      expect((caught as PxError).message).toContain('3-6');
      expect((caught as PxError).hint).toContain('3 to 6');
    }
  });

  it('rejects a non-integer or non-numeric count with E_BAD_PARAM', () => {
    for (const value of ['1.5', '4.2', 'many', '']) {
      let caught: unknown;
      try {
        parseStepCount(value);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(PxError);
      expect((caught as PxError).code).toBe('E_BAD_PARAM');
    }
  });

  it('raises the range error from the CLI, not a generic failure', () => {
    const tooFew = run(['init', '--file', 'a.px.json', '--synthesize', 'leaf=#4a8f3c:2']);
    expect(tooFew.code).toBe(1);
    expect(errorOf(tooFew.envelope).code).toBe('E_RAMP_STEPS_RANGE');
    expect(errorOf(tooFew.envelope).hint).toContain('3 to 6');

    const tooMany = run(['init', '--file', 'a.px.json', '--synthesize', 'leaf=#4a8f3c:7']);
    expect(tooMany.code).toBe(1);
    expect(errorOf(tooMany.envelope).code).toBe('E_RAMP_STEPS_RANGE');

    expect(run(['init', '--file', 'ok.px.json', '--synthesize', 'leaf=#4a8f3c:6']).code).toBe(0);
  });

  it('raises E_BAD_PARAM from the CLI for a fractional step count', () => {
    const result = run(['init', '--file', 'a.px.json', '--synthesize', 'leaf=#4a8f3c:1.5']);
    expect(result.code).toBe(1);
    expect(errorOf(result.envelope).code).toBe('E_BAD_PARAM');
  });

  it('rejects the same counts through px synthesize', () => {
    expect(run(['init', '--file', 'a.px.json']).code).toBe(0);
    for (const steps of ['2', '7', '0', '1.5']) {
      const result = run([
        'synthesize',
        '--file',
        'a.px.json',
        '--family',
        'gold',
        '--from',
        '#d9a036',
        '--steps',
        steps,
      ]);
      expect(result.code).toBe(1);
      expect(errorOf(result.envelope).code).toBe(
        steps === '1.5' ? 'E_BAD_PARAM' : 'E_RAMP_STEPS_RANGE',
      );
    }
  });
});
