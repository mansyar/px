import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/cli/main.js';

/**
 * FR-23: 0 success, 1 caller error, 2 internal, 3 lint gate.
 *
 * A caller error (a bad recipe) must never claim an engine fault, and an engine
 * fault must never blame the recipe. This file forces one genuine internal
 * fault: the renderer throws, which is exactly what `internalError` exists for.
 */

vi.mock('../../src/render/render.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/render/render.js')>();
  return {
    ...actual,
    renderRecipe: (recipe: Parameters<typeof actual.renderRecipe>[0]) => {
      if (recipe.meta.name === 'internal-boom') {
        throw new Error('synthetic engine fault');
      }
      return actual.renderRecipe(recipe);
    },
  };
});

interface Envelope {
  v: number;
  ok: boolean;
  error?: { code: string; message: string; hint: string };
}

interface RunResult {
  code: number;
  envelope: Envelope;
}

let workspace = '';

function run(args: string[]): RunResult {
  let raw = '';
  const code = runCli(args, {
    cwd: workspace,
    stdout: (text) => {
      raw += text;
    },
    stderr: () => undefined,
  });
  return { code, envelope: JSON.parse(raw) as Envelope };
}

beforeAll(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-internal-'));
});

afterAll(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('exit code contract', () => {
  it('exits 2 with E_INTERNAL when the engine throws', () => {
    expect(
      run([
        'init',
        '--file',
        'boom.px.json',
        '--name',
        'internal-boom',
        '--width',
        '8',
        '--height',
        '8',
      ]).code,
    ).toBe(0);

    const result = run(['render', '--file', 'boom.px.json', '--out', 'boom.png']);

    expect(result.code).toBe(2);
    expect(result.envelope.ok).toBe(false);
    expect(result.envelope.error?.code).toBe('E_INTERNAL');
    expect(result.envelope.error?.message).toContain('synthetic engine fault');
    expect(result.envelope.error?.hint).toContain('engine defect');
  });

  it('keeps an ordinary caller error at exit 1', () => {
    const result = run(['render', '--file', 'missing.px.json', '--out', 'missing.png']);

    expect(result.code).toBe(1);
    expect(result.envelope.error?.code).toBe('E_FILE_NOT_FOUND');
  });
});
