/**
 * FR-1 / FR-2 / AC-1 / AC-3: the --onion selector produces a sibling strip,
 * rejects bad indices and non-framed recipes, and never touches --out or the
 * recipe. These are CLI-level checks; the pure composite is covered in the
 * render view unit tests.
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { type CliIo, runCli } from '../../src/cli/main.js';
import { decodePng } from '../../src/render/png.js';

const dirs: string[] = [];

function io(dir: string): CliIo & { state: { text: string } } {
  const state = { text: '' };
  return {
    cwd: dir,
    stdout: (chunk: string) => {
      state.text += chunk;
    },
    stderr: () => undefined,
    state,
  };
}

function envelopeOf(out: CliIo & { state: { text: string } }): Record<string, unknown> {
  return JSON.parse(out.state.text) as Record<string, unknown>;
}

function recipe(framed: boolean): string {
  const raw: Record<string, unknown> = {
    version: '1.4',
    meta: { name: 'anim', width: 8, height: 8, alpha_mode: 'binary' },
    palette: { ink: { colors: ['#111111', '#eeeeee'] } },
    layers: [
      {
        id: 'base',
        ops: [{ op: 'rect', x: 0, y: 0, w: 4, h: 8, color: 'ink.0' }],
      },
    ],
  };
  if (framed) {
    raw.frames = [
      {
        id: 'move',
        layers: [
          {
            id: 'base',
            ops: [{ op: 'rect', x: 4, y: 0, w: 4, h: 8, color: 'ink.1' }],
          },
        ],
      },
    ];
  }
  return JSON.stringify(raw);
}

function fixture(framed = true): string {
  const dir = mkdtempSync(join(tmpdir(), 'px-onion-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'anim.px.json'), recipe(framed));
  return dir;
}

function errorCode(out: CliIo & { state: { text: string } }): string | undefined {
  const error = envelopeOf(out).error;
  return (error as { code?: string } | undefined)?.code;
}

function errorText(out: CliIo & { state: { text: string } }): string {
  return JSON.stringify(envelopeOf(out).error);
}

function panelIsBlank(rgba: Uint8Array, width: number, height: number, panel: number): boolean {
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const index = (row * width * 3 + panel * width + col) * 4;
      if ((rgba[index + 3] ?? 0) !== 0) {
        return false;
      }
    }
  }
  return true;
}

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('render onion view (FR-1, FR-2, AC-1, AC-3)', () => {
  it('writes a deterministic sibling strip and leaves --out and the recipe untouched', () => {
    const dir = fixture();
    const baseline = io(dir);
    expect(runCli(['render', '--file', 'anim.px.json', '--out', 'anim.png'], baseline)).toBe(0);
    const normalBefore = readFileSync(join(dir, 'anim.png'));
    const recipeBefore = readFileSync(join(dir, 'anim.px.json'));

    const out = io(dir);
    expect(
      runCli(['render', '--file', 'anim.px.json', '--out', 'anim.png', '--onion', '1'], out),
    ).toBe(0);
    const payload = envelopeOf(out);
    expect(payload.out).toBe('anim.onion1.png');
    expect(payload.view).toMatchObject({ kind: 'onion', index: 1 });
    const stripBytes = readFileSync(join(dir, 'anim.onion1.png'));
    const strip = decodePng(stripBytes);
    expect({ width: strip.width, height: strip.height }).toEqual({ width: 24, height: 8 });
    expect(panelIsBlank(strip.rgba, 8, 8, 0)).toBe(false);
    expect(panelIsBlank(strip.rgba, 8, 8, 2)).toBe(true);

    const second = io(dir);
    expect(
      runCli(['render', '--file', 'anim.px.json', '--out', 'anim.png', '--onion', '1'], second),
    ).toBe(0);
    expect(readFileSync(join(dir, 'anim.onion1.png'))).toEqual(stripBytes);

    expect(readFileSync(join(dir, 'anim.png'))).toEqual(normalBefore);
    expect(readFileSync(join(dir, 'anim.px.json'))).toEqual(recipeBefore);
  });

  it('emits a blank previous panel for frame 0', () => {
    const dir = fixture();
    const out = io(dir);
    expect(
      runCli(['render', '--file', 'anim.px.json', '--out', 'anim.png', '--onion', '0'], out),
    ).toBe(0);
    const strip = decodePng(readFileSync(join(dir, 'anim.onion0.png')));
    expect(panelIsBlank(strip.rgba, 8, 8, 0)).toBe(true);
    expect(panelIsBlank(strip.rgba, 8, 8, 1)).toBe(false);
    expect(panelIsBlank(strip.rgba, 8, 8, 2)).toBe(false);
  });

  it('rejects onion combined with --debug or --export', () => {
    const dir = fixture();
    for (const extra of [['--debug'], ['--export']]) {
      const out = io(dir);
      expect(
        runCli(
          ['render', '--file', 'anim.px.json', '--out', 'anim.png', '--onion', '1', ...extra],
          out,
        ),
      ).toBe(1);
      expect(errorCode(out)).toBe('E_USAGE');
    }
  });

  it('rejects non-integer, negative and out-of-range indices with the valid range', () => {
    const dir = fixture();
    for (const value of ['abc', '-1', '1.5', '2', '99']) {
      const out = io(dir);
      expect(
        runCli(['render', '--file', 'anim.px.json', '--out', 'anim.png', '--onion', value], out),
      ).toBe(1);
      expect(errorCode(out)).toBe('E_BAD_PARAM');
      expect(errorText(out)).toContain('[0,');
      if (Number.isInteger(Number(value)) && Number(value) > 1) {
        expect(errorText(out)).toContain('[0, 1]');
      }
    }
    expect(readdirSync(dir).filter((entry) => entry.startsWith('anim.onion'))).toEqual([]);
  });

  it('requires a framed recipe and writes nothing when it has no frames', () => {
    const dir = fixture(false);
    const out = io(dir);
    expect(
      runCli(['render', '--file', 'anim.px.json', '--out', 'anim.png', '--onion', '0'], out),
    ).toBe(1);
    expect(errorCode(out)).toBe('E_BAD_PARAM');
    expect(errorText(out)).toContain('frame');
    expect(readdirSync(dir)).toEqual(['anim.px.json']);
  });
});
