/**
 * `px diff` (FR-23): prove an edit landed. The command renders the recipe in
 * memory and compares it with a previous PNG or a previous sha256. A PNG gives
 * a pixel count, a bounding box and a per-part breakdown; a hash can only say
 * "same" or "different", so it reports `count: null` rather than inventing
 * locations it never measured (W_DIFF_HASH_ONLY).
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { renderRecipe, sha256Hex } from '../../src/render/render.js';

interface DiffEnvelope {
  v: number;
  ok: boolean;
  command?: string;
  identical?: boolean;
  against?: { kind: string; path?: string; sha256: string };
  changed?: { count: number | null; bounds: { x: number; y: number; w: number; h: number } | null };
  parts?: Array<{ part: string | null; changed: number | null }>;
  out?: string;
  warnings?: Array<{ code: string; message: string }>;
  error?: { code: string; message: string };
  [key: string]: unknown;
}

let workspace = '';

function run(args: string[]): { code: number; envelope: DiffEnvelope; raw: string } {
  let raw = '';
  const code = runCli(args, {
    cwd: workspace,
    stdout: (text) => {
      raw += text;
    },
    stderr: () => undefined,
  });
  return { code, envelope: JSON.parse(raw) as DiffEnvelope, raw };
}

/** The tagged rectangle the fixtures draw: 6x2 at (4, 6), owned by `blade`. */
function bladeOps(): unknown[] {
  return [{ op: 'rect', x: 4, y: 6, w: 6, h: 2, color: 'steel.base', part: 'blade' }];
}

/** A 16x16 recipe; `ops` defaults to one 6x2 rectangle owned by `blade`. */
function body(
  options: { width?: number; part?: boolean; ops?: unknown[] } = {},
): Record<string, unknown> {
  const part = options.part !== false;
  const base = {
    version: '1.1',
    meta: { name: 'diff', width: options.width ?? 16, height: 16, alpha_mode: 'binary' },
    palette: { steel: { ramp: { shadow: '#101010', base: '#303030', highlight: '#909090' } } },
    anchors: {},
    layers: [
      {
        id: 'base',
        ops:
          options.ops ??
          (part ? bladeOps() : [{ op: 'rect', x: 4, y: 6, w: 6, h: 2, color: 'steel.base' }]),
      },
    ],
  };
  return part ? { ...base, parts: { blade: { material: 'steel', gloss: 'matte' } } } : base;
}

function text(recipe: Record<string, unknown>): string {
  return `${JSON.stringify(recipe, null, 2)}\n`;
}

function write(name: string, contents: string): void {
  writeFileSync(join(workspace, name), contents, 'utf8');
}

/** The render of a recipe body, for hashes and byte comparisons. */
function renderOf(recipe: Record<string, unknown>): Uint8Array {
  return renderRecipe(parseRecipe(text(recipe)).recipe).png;
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'px-diff-'));
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('px diff against a PNG', () => {
  it('reports identical when the file is the current render, with every part at zero', () => {
    write('hero.px.json', text(body()));
    expect(run(['render', '--file', 'hero.px.json', '--out', 'prev.png']).code).toBe(0);

    const { code, envelope } = run(['diff', '--file', 'hero.px.json', '--against', 'prev.png']);
    expect(code).toBe(0);
    expect(envelope.command).toBe('diff');
    expect(envelope.identical).toBe(true);
    expect(envelope.changed).toEqual({ count: 0, bounds: null });
    expect(envelope.against?.kind).toBe('png');
    expect(envelope.against?.path).toBe('prev.png');
    expect(envelope.against?.sha256).toBe(`sha256:${sha256Hex(renderOf(body()))}`);
    // Every declared part is listed even when nothing changed, plus the
    // unowned row, so "no change" never looks like "missing row".
    expect(envelope.parts).toEqual([
      { part: 'blade', changed: 0 },
      { part: null, changed: 0 },
    ]);
  });

  it('locates a change as a count, a bounding box and a per-part breakdown', () => {
    write('hero.px.json', text(body()));
    expect(run(['render', '--file', 'hero.px.json', '--out', 'prev.png']).code).toBe(0);
    // One extra pixel inside the part and one outside it, both painted after
    // the rect so neither is overwritten.
    write(
      'hero.px.json',
      text(
        body({
          ops: [
            ...bladeOps(),
            { op: 'set_pixels', points: [[5, 6]], color: 'steel.highlight', part: 'blade' },
            { op: 'set_pixels', points: [[12, 7]], color: 'steel.highlight' },
          ],
        }),
      ),
    );

    const { envelope } = run(['diff', '--file', 'hero.px.json', '--against', 'prev.png']);
    expect(envelope.identical).toBe(false);
    expect(envelope.changed).toEqual({ count: 2, bounds: { x: 5, y: 6, w: 8, h: 2 } });
    expect(envelope.parts).toEqual([
      { part: 'blade', changed: 1 },
      { part: null, changed: 1 },
    ]);
  });

  it('pinpoints a one-pixel edit: a 1x1 box is the coordinate itself', () => {
    write('hero.px.json', text(body()));
    expect(run(['render', '--file', 'hero.px.json', '--out', 'prev.png']).code).toBe(0);
    // Recolour one pixel the rect already paints (5, 6): same shape, one tone
    // different, so the only evidence is the bounding box.
    write(
      'hero.px.json',
      text(
        body({
          ops: [
            ...bladeOps(),
            { op: 'set_pixels', points: [[5, 6]], color: 'steel.highlight', part: 'blade' },
          ],
        }),
      ),
    );

    const { envelope } = run(['diff', '--file', 'hero.px.json', '--against', 'prev.png']);
    expect(envelope.identical).toBe(false);
    expect(envelope.changed).toEqual({ count: 1, bounds: { x: 5, y: 6, w: 1, h: 1 } });
    expect(envelope.parts).toEqual([
      { part: 'blade', changed: 1 },
      { part: null, changed: 0 },
    ]);
  });

  it('writes the current render when --out is given', () => {
    write('hero.px.json', text(body()));
    const { envelope } = run([
      'diff',
      '--file',
      'hero.px.json',
      '--against',
      `sha256:${'0'.repeat(64)}`,
      '--out',
      'now.png',
    ]);
    expect(envelope.out).toBe('now.png');
    const written = new Uint8Array(readFileSync(join(workspace, 'now.png')));
    expect(Array.from(written)).toEqual(Array.from(renderOf(body())));
  });

  it('rejects a comparison image of a different size with E_DIFF_SIZE', () => {
    write('hero.px.json', text(body()));
    expect(run(['render', '--file', 'hero.px.json', '--out', 'prev.png']).code).toBe(0);
    write('wide.px.json', text(body({ width: 24 })));
    const { code, envelope } = run(['diff', '--file', 'wide.px.json', '--against', 'prev.png']);
    expect(code).toBe(1);
    expect(envelope.error?.code).toBe('E_DIFF_SIZE');
    expect(envelope.error?.message).toContain('24x16');
    expect(envelope.error?.message).toContain('16x16');
  });

  it('omits the parts table for a recipe that declares none', () => {
    write('plain.px.json', text(body({ part: false })));
    expect(run(['render', '--file', 'plain.px.json', '--out', 'prev.png']).code).toBe(0);
    const { envelope } = run(['diff', '--file', 'plain.px.json', '--against', 'prev.png']);
    expect(envelope.identical).toBe(true);
    expect(envelope).not.toHaveProperty('parts');
  });
});

describe('px diff against a hash', () => {
  it('reports identical for the current render hash', () => {
    write('hero.px.json', text(body()));
    const hash = `sha256:${sha256Hex(renderOf(body()))}`;
    const { envelope } = run(['diff', '--file', 'hero.px.json', '--against', hash]);
    expect(envelope.identical).toBe(true);
    expect(envelope.against).toEqual({ kind: 'hash', sha256: hash });
    expect(envelope.changed).toEqual({ count: 0, bounds: null });
    expect(envelope.parts).toEqual([
      { part: 'blade', changed: 0 },
      { part: null, changed: 0 },
    ]);
  });

  it('proves a difference without inventing a per-pixel diff', () => {
    write('hero.px.json', text(body()));
    const { code, envelope } = run([
      'diff',
      '--file',
      'hero.px.json',
      '--against',
      `sha256:${'a'.repeat(64)}`,
    ]);
    expect(code).toBe(0);
    expect(envelope.identical).toBe(false);
    // A hash can prove difference but not locate it: no count, no bounds.
    expect(envelope.changed).toEqual({ count: null, bounds: null });
    expect(envelope.parts).toEqual([
      { part: 'blade', changed: null },
      { part: null, changed: null },
    ]);
    expect(envelope.warnings?.map((warning) => warning.code)).toEqual(['W_DIFF_HASH_ONLY']);
    expect(envelope.warnings?.[0]?.message).toContain('cannot say where');
  });

  it('rejects a malformed hash ref', () => {
    write('hero.px.json', text(body()));
    const { code, envelope } = run(['diff', '--file', 'hero.px.json', '--against', 'sha256:abc']);
    expect(code).toBe(1);
    expect(envelope.error?.code).toBe('E_USAGE');
  });
});
