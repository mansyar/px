/**
 * The backdrop a caller asks to check reaches the linter: `render --backdrop`
 * changes the `SILHOUETTE_LOSS` verdict for the same recipe, with no other
 * findings involved.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

interface RunResult {
  code: number;
  envelope: { findings?: Array<{ code: string; message: string }> };
}

const dir = mkdtempSync(join(tmpdir(), 'px-art-backdrop-'));
const FILE = 'sprite.px.json';

writeFileSync(
  join(dir, FILE),
  JSON.stringify({
    version: '1.1',
    meta: { name: 'art', width: 8, height: 8, alpha_mode: 'binary' },
    palette: { steel: { ramp: { shadow: '#303030', base: '#808080', highlight: '#c0c0c0' } } },
    parts: { orb: { material: 'steel' } },
    anchors: {},
    layers: [
      {
        id: 'base',
        ops: [{ op: 'rect', x: 2, y: 2, w: 4, h: 4, color: 'steel.base', part: 'orb' }],
      },
    ],
  }),
);

function run(args: string[]): RunResult {
  const chunks: string[] = [];
  const code = runCli(args, {
    cwd: dir,
    stdout: (text) => chunks.push(text),
    stderr: () => undefined,
  });
  return { code, envelope: JSON.parse(chunks.join('')) as RunResult['envelope'] };
}

function silhouette(result: RunResult): Array<{ code: string; message: string }> {
  return (result.envelope.findings ?? []).filter((finding) => finding.code === 'SILHOUETTE_LOSS');
}

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('render --backdrop', () => {
  it('lints against the default grey when no backdrop is asked for', () => {
    const result = run(['render', '--file', FILE, '--out', 'grey.png', '--debug']);
    expect(result.code).toBe(0);
    const findings = silhouette(result);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('#808080');
  });

  it('lints against the backdrop the caller named', () => {
    const result = run([
      'render',
      '--file',
      FILE,
      '--out',
      'black.png',
      '--debug',
      '--backdrop',
      '#000000',
    ]);
    expect(result.code).toBe(0);
    expect(silhouette(result)).toEqual([]);
  });
});
