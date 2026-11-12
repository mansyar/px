/**
 * Per-part statistics (FR-24) and their place on the debug sheet. `inspect`
 * grows a tone table and a fixed value histogram on every part entry, and the
 * sheet gains a bounded crop strip: six crops at most, wrapped into rows, with
 * a caption that says how many parts were left out. A recipe without parts sees
 * neither addition, which is what keeps every earlier response byte-identical.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { compileRecipe } from '../../src/core/compile.js';
import { partDetails } from '../../src/core/parts.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Recipe } from '../../src/core/recipe/types.js';
import { renderDebugSheet } from '../../src/render/debug/sheet.js';

interface InspectPart {
  name: string;
  material: string;
  gloss: string;
  z: number;
  painted: number;
  bounds: { x: number; y: number; w: number; h: number } | null;
  tones: Array<{ slot: string; count: number }>;
  slot_count: number;
  truncated?: true;
  values: number[];
}

/** Greys spread across the value range, one flat slot each. */
const GREYS = [
  '#000000',
  '#202020',
  '#404040',
  '#606060',
  '#808080',
  '#a0a0a0',
  '#c0c0c0',
  '#ffffff',
];

/** The CLI needs a real directory for `--file`, even for an in-memory search. */
let workspace = '';

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-stats-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function text(
  ops: unknown[],
  parts: Record<string, { material: string }> = { blade: { material: 'ink' } },
): string {
  const recipe = {
    version: '1.1',
    meta: { name: 'stats', width: 16, height: 16, alpha_mode: 'binary' },
    palette: { ink: { colors: GREYS } },
    ...(Object.keys(parts).length > 0 ? { parts } : {}),
    anchors: {},
    layers: [{ id: 'base', ops }],
  };
  return `${JSON.stringify(recipe, null, 2)}\n`;
}

function inspectParts(source: string): InspectPart[] {
  const { recipe } = parseRecipe(source);
  const compiled = compileRecipe(recipe);
  // The same call runInspect makes, over the same compiled buffers.
  return partDetails(
    compiled.width,
    compiled.height,
    compiled.owners,
    compiled.flattened,
    recipe.parts ?? {},
    compiled.slots,
  ) as InspectPart[];
}

describe('inspect part statistics', () => {
  it('reports bounds, painted count, a tone table and an eight-bucket value histogram', () => {
    const parts = inspectParts(
      text([
        {
          op: 'rect',
          x: 2,
          y: 3,
          w: 4,
          h: 2,
          color: 'ink.7',
          part: 'blade',
        },
        {
          op: 'set_pixels',
          points: [
            [2, 3],
            [3, 3],
          ],
          color: 'ink.0',
          part: 'blade',
        },
      ]),
    );

    expect(parts).toHaveLength(1);
    const blade = parts[0];
    expect(blade?.name).toBe('blade');
    expect(blade?.painted).toBe(8);
    expect(blade?.bounds).toEqual({ x: 2, y: 3, w: 4, h: 2 });
    expect(blade?.tones).toEqual([
      { slot: 'ink.7', count: 6 },
      { slot: 'ink.0', count: 2 },
    ]);
    expect(blade?.slot_count).toBe(2);
    expect(blade?.truncated).toBeUndefined();
    // Black in bucket 0, white in bucket 7, always eight buckets.
    expect(blade?.values).toEqual([2, 0, 0, 0, 0, 0, 0, 6]);
  });

  it('orders equal counts by slot name so the table is stable', () => {
    const parts = inspectParts(
      text([
        { op: 'set_pixels', points: [[1, 1]], color: 'ink.0', part: 'blade' },
        { op: 'set_pixels', points: [[2, 1]], color: 'ink.1', part: 'blade' },
        { op: 'set_pixels', points: [[3, 1]], color: 'ink.2', part: 'blade' },
      ]),
    );
    expect(parts[0]?.tones.map((tone) => tone.slot)).toEqual(['ink.0', 'ink.1', 'ink.2']);
  });

  it('caps the tone table at 24 slots and says how many the part really used', () => {
    const many = Array.from(
      { length: 30 },
      (_, index) => `#${(index * 8).toString(16).padStart(2, '0')}0000`,
    );
    const source = `${JSON.stringify(
      {
        version: '1.1',
        meta: { name: 'many', width: 16, height: 16, alpha_mode: 'binary' },
        palette: { ink: { colors: many } },
        parts: { blade: { material: 'ink' } },
        anchors: {},
        layers: [
          {
            id: 'base',
            ops: many.map((_, index) => ({
              op: 'set_pixels',
              points: [[index % 16, Math.floor(index / 16)]],
              color: `ink.${index}`,
              part: 'blade',
            })),
          },
        ],
      },
      null,
      2,
    )}\n`;

    const parts = inspectParts(source);
    // 30 distinct slots of one pixel each: the cap keeps 24, the count is true.
    expect(parts[0]?.slot_count).toBe(30);
    expect(parts[0]?.tones).toHaveLength(24);
    expect(parts[0]?.truncated).toBe(true);
    expect(parts[0]?.tones.every((tone) => tone.count === 1)).toBe(true);
  });

  it('keeps a 256x256 scene with 2000 ops under a 320 KB inspect response', () => {
    // NFR-4: the response is bounded by the canvas and the tone cap, not by the
    // op count. 2000 ops over one part must not grow the envelope with each op.
    const ops = Array.from({ length: 2000 }, (_, index) => ({
      op: 'set_pixels',
      points: [[index % 256, Math.floor(index / 256)]],
      color: `ink.${index % GREYS.length}`,
      part: 'blade',
    }));
    const source = `${JSON.stringify(
      {
        version: '1.1',
        meta: { name: 'scene', width: 256, height: 256, alpha_mode: 'binary' },
        palette: { ink: { colors: GREYS } },
        parts: { blade: { material: 'ink' } },
        anchors: {},
        layers: [{ id: 'base', ops }],
      },
      null,
      2,
    )}\n`;
    writeFileSync(join(workspace, 'scene.px.json'), source, 'utf8');

    let raw = '';
    const code = runCli(['inspect', '--file', 'scene.px.json', '--summary'], {
      cwd: workspace,
      stdout: (chunk) => {
        raw += chunk;
      },
      stderr: () => undefined,
    });
    expect(code).toBe(0);
    const envelope = JSON.parse(raw) as { parts: InspectPart[] };
    expect(envelope.parts[0]?.tones.length).toBeLessThanOrEqual(24);
    expect(envelope.parts[0]?.values).toHaveLength(8);
    expect(envelope.parts[0]?.painted).toBe(2000);
    // Bounded: the canvas matrix dominates, and the tone cap keeps parts flat.
    expect(raw.length).toBeLessThan(320 * 1024);
  });

  it('leaves a part-less inspect envelope with exactly the keys it always had', () => {
    const path = join(workspace, 'plain.px.json');
    writeFileSync(path, text([{ op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'ink.1' }], {}), 'utf8');
    let raw = '';
    const code = runCli(['inspect', '--file', 'plain.px.json', '--summary'], {
      cwd: workspace,
      stdout: (chunk) => {
        raw += chunk;
      },
      stderr: () => undefined,
    });
    expect(code).toBe(0);
    // Phase 1 fixed this list; FR-24 must not add a key to it.
    expect(Object.keys(JSON.parse(raw) as Record<string, unknown>)).toEqual([
      'v',
      'ok',
      'command',
      'file',
      'canvas',
      'regions',
      'legend',
      'summary',
      'layers',
    ]);
  });
});

/** A recipe with `count` parts, the first having the most painted pixels. */
function partsRecipe(count: number): Recipe {
  const parts: Record<string, { material: string }> = {};
  const ops: unknown[] = [];
  for (let index = 0; index < count; index += 1) {
    const name = `part${String(index).padStart(2, '0')}`;
    parts[name] = { material: 'ink' };
    ops.push(
      // Descending area, so the ranking is unambiguous.
      { op: 'rect', x: 0, y: index, w: count - index, h: 1, color: 'ink.1', part: name },
    );
  }
  return parseRecipe(text(ops, parts)).recipe;
}

describe('debug sheet crop strip', () => {
  it('adds no strip and keeps the exact height for a recipe without parts', () => {
    const { recipe } = parseRecipe(
      text([{ op: 'rect', x: 1, y: 1, w: 2, h: 2, color: 'ink.1' }], {}),
    );
    const sheet = renderDebugSheet(compileRecipe(recipe), {});
    expect(sheet.strip).toBeUndefined();
    expect(sheet.crops).toBeUndefined();
    // The pre-strip formula: the sheet ends after the profile caption.
    expect(sheet.height).toBe(sheet.panels.c.y + sheet.panels.c.h + 4 + 10 + 4);
    expect(sheet.width).toBe(sheet.panels.a.x + sheet.panels.a.w + 4);
  });

  it('draws one crop per part, largest first, inside the existing width', () => {
    const compiled = compileRecipe(partsRecipe(3));
    const sheet = renderDebugSheet(compiled, {});
    expect(sheet.crops?.map((crop) => crop.part)).toEqual(['part00', 'part01', 'part02']);
    expect(sheet.strip).toBeDefined();
    for (const crop of sheet.crops ?? []) {
      expect(crop.rect.x).toBeGreaterThanOrEqual(sheet.strip?.x ?? 0);
      expect(crop.rect.y).toBeGreaterThanOrEqual(sheet.strip?.y ?? 0);
      // Each crop is the bbox plus a one-pixel margin, so at least 3 px wide.
      expect(crop.rect.w).toBeGreaterThanOrEqual(3);
    }
    // The strip wraps inside the sheet: width is unchanged by declaring parts.
    const partless = renderDebugSheet(
      compileRecipe(
        parseRecipe(text([{ op: 'rect', x: 0, y: 0, w: 1, h: 1, color: 'ink.1' }], {})).recipe,
      ),
      {},
    );
    expect(sheet.width).toBe(partless.width);
    expect(sheet.height).toBeGreaterThan(partless.height);
  });

  it('shows at most six crops and stays bounded with more parts', () => {
    const compiled = compileRecipe(partsRecipe(9));
    const sheet = renderDebugSheet(compiled, {});
    expect(sheet.crops).toHaveLength(6);
    expect(sheet.crops?.map((crop) => crop.part)).toEqual([
      'part00',
      'part01',
      'part02',
      'part03',
      'part04',
      'part05',
    ]);
    // Bounded height: the strip wraps, so nine parts cost at most a few rows.
    expect(sheet.height).toBeLessThan(600);
  });

  it('stays byte-deterministic with a strip', () => {
    const first = renderDebugSheet(compileRecipe(partsRecipe(4)), {});
    const second = renderDebugSheet(compileRecipe(partsRecipe(4)), {});
    expect(Array.from(second.png)).toEqual(Array.from(first.png));
    expect(second.crops).toEqual(first.crops);
  });
});
