/**
 * AC-21 calibration harness.
 *
 * Replays each committed authoring transcript through the CLI command layer
 * in-process — no child process, so the call count is exactly the number of
 * transcript entries and CI stays fast. One entry is one call.
 *
 * Per asset it asserts:
 *
 * - the whole transcript fits the 12-call budget;
 * - every call exits 0 (a failure names the asset, the call index and the code);
 * - `render --strict` exits 0 with zero findings, including no OUT_OF_BOUNDS
 *   and no ORPHAN_PIXEL;
 * - the replay reproduces the committed recipe byte for byte;
 * - rendering the committed recipe reproduces the committed PNG hash;
 * - the recipe exercises at least four op types and no single `set_pixels` op
 *   paints more than a quarter of the sprite.
 *
 * The silhouette bar is a judgement, recorded in the phase evidence file, not
 * a number invented here.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { compileRecipe } from '../../src/core/compile.js';
import { TRANSPARENT_SLOT } from '../../src/core/palette.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Op, Recipe } from '../../src/core/recipe/types.js';
import { renderRecipe, sha256Hex } from '../../src/render/render.js';

const BENCHMARKS = ['potion', 'sword', 'humanoid', 'chest'] as const;
type Benchmark = (typeof BENCHMARKS)[number];

const MAX_CALLS = 12;
const MIN_OP_TYPES = 4;
const MAX_SET_PIXELS_SHARE = 0.25;
const MIN_PAINTED_SHARE = 0.2;

const ROOT = join(process.cwd(), 'test/benchmarks');

interface TranscriptCall {
  verb: string;
  /** CLI argv; an entry that is not a string is JSON-stringified into one token. */
  argv: Array<string | unknown>;
}

interface Transcript {
  asset: string;
  v: number;
  calls: TranscriptCall[];
}

interface Finding {
  code: string;
  message: string;
}

interface Envelope {
  v: number;
  ok: boolean;
  error?: { code: string; message: string; hint?: string };
  findings?: Finding[];
  sha256?: string;
  [key: string]: unknown;
}

const workspaces: string[] = [];

afterAll(() => {
  for (const workspace of workspaces) {
    rmSync(workspace, { recursive: true, force: true });
  }
});

function tokens(argv: readonly (string | unknown)[]): string[] {
  return argv.map((entry) => (typeof entry === 'string' ? entry : JSON.stringify(entry)));
}

function call(cwd: string, verb: string, argv: readonly (string | unknown)[]): Envelope {
  let raw = '';
  const code = runCli([verb, ...tokens(argv)], {
    cwd,
    stdout: (text) => {
      raw += text;
    },
    stderr: () => {},
  });
  let envelope: Envelope;
  try {
    envelope = JSON.parse(raw) as Envelope;
  } catch {
    throw new Error(`${verb} emitted no JSON envelope (exit ${code}): ${raw}`);
  }
  if (code !== 0 || !envelope.ok) {
    const problem = envelope.error;
    throw new Error(
      problem === undefined
        ? `${verb} exited ${code}: ${raw}`
        : `${verb} exited ${code} with ${problem.code}: ${problem.message}`,
    );
  }
  return envelope;
}

function paintedPixels(recipe: Recipe): number {
  let painted = 0;
  for (const slot of compileRecipe(recipe).flattened) {
    if (slot !== TRANSPARENT_SLOT) {
      painted += 1;
    }
  }
  return painted;
}

function opTypes(ops: readonly Op[]): string[] {
  return [...new Set(ops.map((op) => op.op))].sort();
}

function setPixelPoints(ops: readonly Op[]): number {
  return ops.reduce((total, op) => (op.op === 'set_pixels' ? total + op.points.length : total), 0);
}

describe.each(BENCHMARKS)('%s benchmark', (asset: Benchmark) => {
  const dir = join(ROOT, asset);
  const transcript = JSON.parse(
    readFileSync(join(dir, `${asset}.calls.json`), 'utf8'),
  ) as Transcript;
  const committedRecipe = readFileSync(join(dir, `${asset}.px.json`), 'utf8');
  const committedHash = readFileSync(join(dir, `${asset}.sha256`), 'utf8').trim();

  it(`builds from ${MAX_CALLS} calls or fewer`, () => {
    expect(transcript.asset, `${asset}.calls.json is a transcript for ${transcript.asset}`).toBe(
      asset,
    );
    expect(transcript.v, `${asset}.calls.json version`).toBe(1);
    expect(
      transcript.calls.length,
      `${asset}.calls.json records ${transcript.calls.length} calls; the budget is ${MAX_CALLS}`,
    ).toBeLessThanOrEqual(MAX_CALLS);
    const renders = transcript.calls.filter((entry) => entry.verb === 'render');
    expect(renders.length, `${asset} must render exactly once`).toBe(1);
    expect(renders[0]?.argv, `${asset} must render under --strict`).toContain('--strict');
  });

  it('replays the transcript to the committed recipe, findings and hash', () => {
    const workspace = mkdtempSync(join(tmpdir(), `px-${asset}-`));
    workspaces.push(workspace);
    const file = `${asset}.px.json`;
    let rendered: Envelope | null = null;

    transcript.calls.forEach((entry, index) => {
      let envelope: Envelope;
      try {
        envelope = call(workspace, entry.verb, entry.argv);
      } catch (error) {
        throw new Error(`${asset} call ${index} (${entry.verb}): ${(error as Error).message}`);
      }
      if (entry.verb === 'render') {
        rendered = envelope;
      }
    });

    if (rendered === null) {
      throw new Error(`${asset}: the transcript never reached a render call`);
    }
    const payload = rendered as Envelope;
    const findings = payload.findings ?? [];
    expect(
      findings.map((finding) => `${finding.code} ${finding.message}`),
      `${asset} call ${transcript.calls.length - 1} (render) reports lint findings`,
    ).toEqual([]);

    expect(
      readFileSync(join(workspace, file), 'utf8'),
      `${asset}: replaying the transcript did not reproduce the committed recipe`,
    ).toBe(committedRecipe);

    expect(payload.sha256, `${asset}: render hash`).toBe(committedHash);
  });

  it('renders the committed recipe to the committed hash', () => {
    const { recipe, warnings } = parseRecipe(committedRecipe);
    expect(warnings, `${asset}: committed recipe parses with warnings`).toEqual([]);
    const first = renderRecipe(recipe);
    expect(first.warnings, `${asset}: committed recipe compiles with warnings`).toEqual([]);
    expect(sha256Hex(first.png), `${asset}.sha256 is stale`).toBe(committedHash);
    const second = renderRecipe(parseRecipe(committedRecipe).recipe);
    expect(sha256Hex(second.png), `${asset}: render is not deterministic`).toBe(committedHash);
  });

  it('spreads the work across op types instead of one pixel dump', () => {
    const { recipe } = parseRecipe(committedRecipe);
    const ops = recipe.layers.flatMap((layer) => layer.ops);
    const types = opTypes(ops);
    expect(
      types.length,
      `${asset} uses ${types.join(', ')}; at least ${MIN_OP_TYPES} op types are required`,
    ).toBeGreaterThanOrEqual(MIN_OP_TYPES);
    const painted = paintedPixels(recipe);
    const area = recipe.meta.width * recipe.meta.height;
    expect(
      painted,
      `${asset}: ${painted} of ${area} pixels painted; an empty canvas is not a benchmark`,
    ).toBeGreaterThanOrEqual(Math.ceil(area * MIN_PAINTED_SHARE));
    const points = setPixelPoints(ops);
    const share = painted === 0 ? 1 : points / painted;
    console.log(
      `${asset}: ${transcript.calls.length} calls, ${ops.length} ops (${types.join(', ')}), ` +
        `${painted} painted of ${area}, set_pixels ${Math.round(share * 100)}%`,
    );
    expect(
      share,
      `${asset}: set_pixels paints ${points} of ${painted} pixels (${Math.round(share * 100)}% > 25%)`,
    ).toBeLessThanOrEqual(MAX_SET_PIXELS_SHARE);
  });
});

describe('benchmark fixtures', () => {
  it('commits one 64-hex hash per asset', () => {
    for (const asset of BENCHMARKS) {
      const hash = readFileSync(join(ROOT, asset, `${asset}.sha256`), 'utf8').trim();
      expect(hash, `${asset}.sha256`).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('declares the anchors a game engine needs', () => {
    const required: Record<Benchmark, string[]> = {
      potion: ['cork_top', 'base_pivot'],
      sword: ['grip_pivot', 'blade_tip'],
      humanoid: ['foot_origin', 'hand_weapon'],
      chest: ['lid_pivot'],
    };
    for (const asset of BENCHMARKS) {
      const { recipe } = parseRecipe(readFileSync(join(ROOT, asset, `${asset}.px.json`), 'utf8'));
      for (const anchor of required[asset]) {
        expect(Object.keys(recipe.anchors), `${asset} is missing the ${anchor} anchor`).toContain(
          anchor,
        );
      }
    }
  });

  it('keeps every anchor inside the canvas', () => {
    for (const asset of BENCHMARKS) {
      const { recipe, warnings } = parseRecipe(
        readFileSync(join(ROOT, asset, `${asset}.px.json`), 'utf8'),
      );
      expect(warnings, `${asset} anchor warnings`).toEqual([]);
      for (const [name, [x, y]] of Object.entries(recipe.anchors)) {
        expect(x, `${asset} anchor ${name} x`).toBeGreaterThanOrEqual(0);
        expect(x, `${asset} anchor ${name} x`).toBeLessThan(recipe.meta.width);
        expect(y, `${asset} anchor ${name} y`).toBeGreaterThanOrEqual(0);
        expect(y, `${asset} anchor ${name} y`).toBeLessThan(recipe.meta.height);
      }
    }
  });
});
