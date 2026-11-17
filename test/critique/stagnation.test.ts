/**
 * FR-13 / AC-10: stagnation is computed only from values the caller supplies.
 * The critique verb keeps no counter and writes no state file, so two identical
 * calls with identical arguments produce identical signals and passing a fresh
 * fingerprint clears the signal immediately.
 */

import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { CliIo } from '../../src/cli/main.js';
import { runCli } from '../../src/cli/main.js';
import { CRITIQUE_STAGNATION_CALLS } from '../../src/critique/index.js';
import { callTool } from '../../src/mcp/tools.js';

const dirs: string[] = [];

const DESIGN = {
  subject: 'prop',
  light: 'top-left',
  hierarchy: ['body'],
  values: { body: 3 },
  edges: { silhouette: 'outline', material: 'shadow', detail: 'highlight' },
  materials: ['steel'],
  style: '@project',
};

function workspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'px-stagnation-'));
  dirs.push(dir);
  writeFileSync(
    join(dir, 'px.style.json'),
    JSON.stringify({
      allowed_ramps: ['steel'],
      edge_vocabulary: ['none', 'outline', 'shadow', 'highlight'],
      default_light: 'top-left',
      min_contrast: 2,
      value_rules: {},
    }),
  );
  const out = io(dir);
  expect(
    runCli(
      [
        'init',
        '--file',
        'hero.px.json',
        '--width',
        '32',
        '--height',
        '32',
        '--palette',
        JSON.stringify({
          steel: {
            ramp: {
              outline: '#000000',
              shadow: '#333333',
              base: '#888888',
              highlight: '#ffffff',
            },
          },
        }),
        '--parts',
        JSON.stringify({ body: { material: 'steel' } }),
        '--design',
        JSON.stringify(DESIGN),
      ],
      out,
    ),
  ).toBe(0);
  expect(
    runCli(
      [
        'draw',
        '--file',
        'hero.px.json',
        '--ops',
        JSON.stringify([
          { op: 'rect', x: 8, y: 8, w: 12, h: 12, color: 'steel.base', part: 'body' },
        ]),
      ],
      out,
    ),
  ).toBe(0);
  return dir;
}

function io(cwd: string): CliIo & { state: { text: string } } {
  const state = { text: '' };
  return {
    cwd,
    stdout: (chunk: string) => {
      state.text += chunk;
    },
    stderr: () => undefined,
    state,
  };
}

interface StagnationEnvelope {
  ok: boolean;
  fingerprint: string;
  render_sha256: string;
  stagnation?: {
    streak: number;
    calls: number;
    fingerprint: string;
    message: string;
  };
}

function critique(dir: string, extra: string[] = []): StagnationEnvelope {
  const out = io(dir);
  expect(runCli(['critique', '--file', 'hero.px.json', ...extra], out)).toBe(0);
  return JSON.parse(out.state.text) as StagnationEnvelope;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('px critique stagnation', () => {
  it('appears only at the configured streak with the matching previous fingerprint', () => {
    const dir = workspace();
    const first = critique(dir);
    expect(first.stagnation).toBeUndefined();

    const below = critique(dir, [
      '--streak',
      String(CRITIQUE_STAGNATION_CALLS - 1),
      '--previous',
      first.fingerprint,
    ]);
    expect(below.stagnation).toBeUndefined();

    const atThreshold = critique(dir, [
      '--streak',
      String(CRITIQUE_STAGNATION_CALLS),
      '--previous',
      first.fingerprint,
    ]);
    expect(atThreshold.stagnation).toMatchObject({
      streak: CRITIQUE_STAGNATION_CALLS,
      calls: CRITIQUE_STAGNATION_CALLS,
      fingerprint: first.fingerprint,
    });
    expect(atThreshold.stagnation?.message).toContain('change');
    expect(atThreshold.fingerprint).toBe(first.fingerprint);
    expect(atThreshold.render_sha256).toBe(first.render_sha256);
  });

  it('clears when the picture changes even if the streak is high', () => {
    const dir = workspace();
    const before = critique(dir);
    const out = io(dir);
    expect(
      runCli(
        [
          'draw',
          '--file',
          'hero.px.json',
          '--ops',
          JSON.stringify([
            { op: 'rect', x: 1, y: 1, w: 3, h: 3, color: 'steel.highlight', part: 'body' },
          ]),
        ],
        out,
      ),
    ).toBe(0);
    const after = critique(dir, [
      '--streak',
      String(CRITIQUE_STAGNATION_CALLS + 6),
      '--previous',
      before.fingerprint,
    ]);
    expect(after.fingerprint).not.toBe(before.fingerprint);
    expect(after.stagnation).toBeUndefined();

    const matching = critique(dir, [
      '--streak',
      String(CRITIQUE_STAGNATION_CALLS + 6),
      '--previous',
      after.fingerprint,
    ]);
    expect(matching.stagnation?.fingerprint).toBe(after.fingerprint);
    expect(matching.stagnation?.streak).toBe(CRITIQUE_STAGNATION_CALLS + 6);
  });

  it('needs both arguments and ignores an invalid previous digest', () => {
    const dir = workspace();
    const first = critique(dir);
    expect(
      critique(dir, ['--streak', String(CRITIQUE_STAGNATION_CALLS)]).stagnation,
    ).toBeUndefined();
    expect(critique(dir, ['--previous', first.fingerprint]).stagnation).toBeUndefined();
    expect(
      critique(dir, ['--streak', String(CRITIQUE_STAGNATION_CALLS), '--previous', 'nope'])
        .stagnation,
    ).toBeUndefined();
  });

  it('retains no state between calls and creates no sidecar file', () => {
    const dir = workspace();
    const beforeFiles = readdirSync(dir).sort();
    const first = critique(dir, [
      '--streak',
      String(CRITIQUE_STAGNATION_CALLS),
      '--previous',
      critique(dir).fingerprint,
    ]);
    expect(first.stagnation).toBeDefined();
    expect(critique(dir).stagnation).toBeUndefined();
    expect(readdirSync(dir).sort()).toEqual(beforeFiles);
    const repeat = critique(dir, [
      '--streak',
      String(CRITIQUE_STAGNATION_CALLS),
      '--previous',
      first.fingerprint,
    ]);
    expect(repeat.stagnation).toEqual(first.stagnation);
  });

  it('exposes the same caller-supplied stagnation through MCP', () => {
    const dir = workspace();
    const first = critique(dir);
    const result = callTool(
      'px_critique',
      {
        file: 'hero.px.json',
        streak: CRITIQUE_STAGNATION_CALLS,
        previous: first.fingerprint,
      },
      { cwd: dir },
    );
    expect(result.isError).toBeUndefined();
    const firstBlock = result.content[0];
    const text = firstBlock !== undefined && 'text' in firstBlock ? firstBlock.text : undefined;
    expect(text).toBeDefined();
    const envelope = JSON.parse(text === undefined ? '{}' : text) as StagnationEnvelope;
    expect(envelope.stagnation?.fingerprint).toBe(first.fingerprint);
    expect(envelope.stagnation?.calls).toBe(CRITIQUE_STAGNATION_CALLS);
    expect(callTool('px_critique', { file: 'hero.px.json' }, { cwd: dir })).toEqual(
      callTool('px_critique', { file: 'hero.px.json' }, { cwd: dir }),
    );
  });
});
