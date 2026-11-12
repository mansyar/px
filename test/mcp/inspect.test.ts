import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  FLAT_LETTERS,
  hexOf,
  inspectCodes,
  renderRegion,
  usedSlots,
} from '../../src/cli/inspect.js';
import { runCli } from '../../src/cli/main.js';
import { buildSlotRoles, buildSlotTable } from '../../src/core/palette.js';
import type { Palette } from '../../src/core/recipe/types.js';
import { relativeLuminance } from '../../src/palettes/luminance.js';

interface InspectEnvelope {
  ok: boolean;
  canvas: { width: number; height: number };
  regions: Array<{ x: number; y: number; w: number; h: number; matrix: string }>;
  legend: Record<string, { family: string; role: string; hex: string; note?: string }>;
  summary?: { canvas: { width: number; height: number }; bounds: unknown; pixel_count: number };
  error?: { code: string };
}

let workspace = '';

function run(args: string[]): { code: number; envelope: InspectEnvelope } {
  let raw = '';
  const code = runCli(args, {
    cwd: workspace,
    stdout: (text) => {
      raw += text;
    },
    stderr: () => undefined,
  });
  return { code, envelope: JSON.parse(raw) as InspectEnvelope };
}

function recipe(name: string, palette: Palette, ops: unknown[]): void {
  writeFileSync(
    join(workspace, `${name}.px.json`),
    JSON.stringify({
      version: 1,
      meta: { name, width: 8, height: 8, alpha_mode: 'binary' },
      palette,
      anchors: { pivot: [4, 4] },
      layers: [{ id: 'base', ops }],
    }),
    'utf8',
  );
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-inspect-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('role codes', () => {
  const table = buildSlotTable({
    steel: {
      ramp: { outline: '#1a1c2c', shadow: '#5d275d', base: '#b13e53', highlight: '#ef7d57' },
    },
  });
  const roles = buildSlotRoles(table);

  it('maps the four ramp roles to o, s, b, h', () => {
    const used = new Set([0, 1, 2, 3]);
    const { codes, legend } = inspectCodes(table, roles, used);
    expect(codes).toEqual(['o', 's', 'b', 'h']);
    expect(legend).toEqual({
      o: { family: 'steel', role: 'outline', hex: '#1a1c2c' },
      s: { family: 'steel', role: 'shadow', hex: '#5d275d' },
      b: { family: 'steel', role: 'base', hex: '#b13e53' },
      h: { family: 'steel', role: 'highlight', hex: '#ef7d57' },
    });
  });

  it('marks a highlight whose relative luminance reaches 0.95 as w', () => {
    const white = buildSlotTable({
      paper: {
        ramp: { outline: '#101010', shadow: '#404040', base: '#909090', highlight: '#ffffff' },
      },
    });
    const { codes, legend } = inspectCodes(white, buildSlotRoles(white), new Set([0, 1, 2, 3]));
    expect(codes[3]).toBe('w');
    expect(legend.w).toEqual({ family: 'paper', role: 'highlight', hex: '#ffffff' });
    expect(relativeLuminance({ r: 255, g: 255, b: 255, a: 255 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ r: 239, g: 125, b: 87, a: 255 })).toBeLessThan(0.95);
  });

  it('suffixes codes with the canonical family ordinal when two families appear', () => {
    const two = buildSlotTable({
      alpha: {
        ramp: { outline: '#000000', shadow: '#111111', base: '#222222', highlight: '#333333' },
      },
      beta: {
        ramp: { outline: '#440000', shadow: '#551111', base: '#662222', highlight: '#773333' },
      },
    });
    const { codes, legend } = inspectCodes(two, buildSlotRoles(two), new Set([2, 6]));
    expect(codes[2]).toBe('b1');
    expect(codes[6]).toBe('b2');
    expect(legend.b1?.family).toBe('alpha');
    expect(legend.b2?.family).toBe('beta');
  });

  it('falls back to sequential letters for a flat family and says so', () => {
    const flat = buildSlotTable({ ink: { colors: ['#101010', '#202020', '#303030'] } });
    const { codes, legend } = inspectCodes(flat, buildSlotRoles(flat), new Set([0, 1, 2]));
    expect(codes).toEqual([FLAT_LETTERS[0], FLAT_LETTERS[1], FLAT_LETTERS[2]]);
    expect(legend[FLAT_LETTERS[0] ?? '']).toEqual({
      family: 'ink',
      role: 'flat',
      hex: '#101010',
      note: 'flat palette: sequential letter code, no roles',
    });
  });

  it('never emits a reserved role letter as a flat code', () => {
    for (const letter of 'osbhw') {
      expect(FLAT_LETTERS).not.toContain(letter);
    }
  });

  it('leaves unused slots without a code', () => {
    const { codes } = inspectCodes(table, roles, new Set([2]));
    expect(codes).toEqual([null, null, 'b', null]);
  });

  it('formats hex from resolved channels', () => {
    expect(hexOf({ r: 139, g: 155, b: 180, a: 255 })).toBe('#8b9bb4');
    expect(hexOf({ r: 0, g: 0, b: 0, a: 255 })).toBe('#000000');
  });
});

describe('region matrices', () => {
  const table = buildSlotTable({ ink: { colors: ['#000000'] } });
  const roles = buildSlotRoles(table);
  const flattened = new Int16Array(8 * 8).fill(-1);
  flattened[0] = 0;
  flattened[1] = 0;
  flattened[8] = 0;
  const { codes } = inspectCodes(table, roles, new Set([0]));

  it('finds the painted slots of a region', () => {
    expect(usedSlots(flattened, 8, { x: 0, y: 0, w: 2, h: 1 })).toEqual(new Set([0]));
    expect(usedSlots(flattened, 8, { x: 4, y: 4, w: 2, h: 2 })).toEqual(new Set());
  });

  it('renders one row per pixel row with two-digit headers', () => {
    const matrix = renderRegion(flattened, 8, { x: 0, y: 0, w: 2, h: 2 }, codes);
    const lines = matrix.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]?.trim()).toBe('');
    expect(lines[1]).toContain('0');
    expect(lines[1]).toContain('1');
    expect(lines[2]).toMatch(/ 0 [ac]/);
    expect(lines[3]).toMatch(/ 1 /);
  });

  it('pads cells to the widest code so multi-family columns line up', () => {
    const palette = {
      alpha: { ramp: { base: '#222222' } },
      beta: { ramp: { base: '#662222' } },
    };
    const wideTable = buildSlotTable(palette);
    const wide = inspectCodes(wideTable, buildSlotRoles(wideTable), new Set([0, 1]));
    const pair = new Int16Array(8 * 8).fill(-1);
    pair[0] = 0;
    pair[1] = 1;
    const matrix = renderRegion(pair, 8, { x: 0, y: 0, w: 2, h: 1 }, wide.codes);
    const last = matrix.split('\n').at(-1) ?? '';
    expect(last.slice(-4)).toBe('b1b2');
  });
});

describe('px inspect', () => {
  it('returns every requested region in request order plus a covering legend', () => {
    recipe(
      'multi',
      {
        ink: {
          ramp: { outline: '#000000', shadow: '#202020', base: '#808080', highlight: '#ffffff' },
        },
      },
      [
        ['set_pixels', [[0, 0]], 'ink.outline'],
        ['set_pixels', [[6, 6]], 'ink.highlight'],
      ],
    );

    const result = run([
      'inspect',
      '--file',
      'multi.px.json',
      '--region',
      '0,0,2,2',
      '--region',
      '6,6,2,2',
    ]);

    expect(result.code).toBe(0);
    expect(result.envelope.regions.map(({ x, y, w, h }) => ({ x, y, w, h }))).toEqual([
      { x: 0, y: 0, w: 2, h: 2 },
      { x: 6, y: 6, w: 2, h: 2 },
    ]);
    expect(result.envelope.regions[0]?.matrix).toContain('o');
    expect(result.envelope.regions[1]?.matrix).toContain('w');
    for (const code of Object.keys(result.envelope.legend)) {
      expect(result.envelope.legend[code]).toBeDefined();
    }
  });

  it('defaults to a full-canvas summary, with a legend for the whole canvas', () => {
    recipe('plain', { ink: { colors: ['#000000', '#ffffff'] } }, [
      ['rect', 1, 1, 4, 4, 'ink.0'],
      ['set_pixels', [[2, 2]], 'ink.1'],
    ]);

    const result = run(['inspect', '--file', 'plain.px.json']);

    expect(result.code).toBe(0);
    expect(result.envelope.regions).toEqual([]);
    expect(result.envelope.summary).toEqual({
      canvas: { width: 8, height: 8 },
      bounds: { x: 1, y: 1, w: 4, h: 4 },
      pixel_count: 16,
    });
    expect(Object.keys(result.envelope.legend).sort()).toEqual(
      [FLAT_LETTERS[0], FLAT_LETTERS[1]].sort(),
    );
  });

  it('returns the full-canvas summary alongside explicit regions when asked', () => {
    recipe('both', { ink: { colors: ['#000000'] } }, [['rect', 2, 2, 2, 2, 'ink.0']]);
    const result = run(['inspect', '--file', 'both.px.json', '--region', '2,2,2,2', '--summary']);
    expect(result.code).toBe(0);
    expect(result.envelope.regions).toHaveLength(1);
    expect(result.envelope.summary?.pixel_count).toBe(4);
  });

  it('returns an empty legend for an empty canvas', () => {
    recipe('empty', { ink: { colors: ['#000000'] } }, []);
    const result = run(['inspect', '--file', 'empty.px.json']);
    expect(result.code).toBe(0);
    expect(result.envelope.legend).toEqual({});
    expect(result.envelope.summary?.bounds).toBeNull();
    expect(result.envelope.summary?.pixel_count).toBe(0);
  });

  it('rejects an out-of-canvas region before doing any work', () => {
    recipe('bad', { ink: { colors: ['#000000'] } }, []);
    const result = run(['inspect', '--file', 'bad.px.json', '--region', '6,6,4,4']);
    expect(result.code).toBe(1);
    expect(result.envelope.error?.code).toBe('E_BAD_PARAM');
  });
});
