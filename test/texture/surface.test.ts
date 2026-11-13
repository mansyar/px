import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';

interface Envelope {
  v: number;
  ok: boolean;
  error?: { code: string; hint: string };
  [key: string]: unknown;
}

let workspace = '';

function run(args: string[]): { code: number; envelope: Envelope } {
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

const RECIPE = {
  version: '1.1',
  meta: { name: 'wall', width: 64, height: 64, alpha_mode: 'binary' },
  palette: {
    cloth: { ramp: { shadow: '#440000', base: '#880000', highlight: '#ff0000' } },
  },
  parts: { wall: { material: 'cloth', gloss: 'matte', z: 0 } },
  anchors: {},
  layers: [{ id: 'base', ops: [] }],
};

beforeAll(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-texture-'));
});

afterAll(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('texture — CLI surface (FR-9, NFR-4)', () => {
  it('authors a texture through `px draw` and reports marks, not pixels', () => {
    writeFileSync(join(workspace, 'wall.px.json'), JSON.stringify(RECIPE));
    const result = run([
      'draw',
      '--file',
      'wall.px.json',
      '--ops',
      JSON.stringify([
        { op: 'rect', x: 0, y: 0, w: 64, h: 64, color: 'cloth.base', part: 'wall' },
        { op: 'texture', pattern: 'stipple', color: 'cloth.shadow', part: 'wall' },
      ]),
    ]);
    expect(result.code).toBe(0);
    const cleanup = result.envelope.cleanup as Array<{
      op: string;
      marks: number;
      changed: number;
      coords: unknown[];
    }>;
    expect(cleanup[0]).toMatchObject({ op: 'texture', coords: [] });
    expect(cleanup[0]?.marks).toBeGreaterThan(0);
    expect(cleanup[0]?.changed).toBe((cleanup[0]?.marks ?? 0) * 4);
  });

  it('returns E_PATTERN_UNKNOWN with the legal patterns from the CLI', () => {
    const result = run([
      'draw',
      '--file',
      'wall.px.json',
      '--ops',
      JSON.stringify([{ op: 'texture', pattern: 'noise', color: 'cloth.shadow', part: 'wall' }]),
    ]);
    expect(result.code).not.toBe(0);
    expect(result.envelope.error?.code).toBe('E_PATTERN_UNKNOWN');
    expect(result.envelope.error?.hint).toContain('stipple');
  });
});
