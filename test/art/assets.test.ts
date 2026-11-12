import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { EXIT_LINT } from '../../src/cli/envelope.js';
import { runCli } from '../../src/cli/main.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { recipeParts } from '../../src/core/recipe/types.js';

/**
 * Guards the seven authored assets in `test/art/**`.
 *
 * The digests here are the record of the art, not a scoring rubric: they prove the
 * committed recipe still renders to the committed image with no blocking lint finding.
 * Scoring lives in `test/art/scores.json` and is produced by `scripts/rubric.mjs`
 * (see `docs/rubric.md`); this file never invents a score.
 */

const ROOT = join(process.cwd(), 'test/art');
const MAX_CALLS = 20;

const ASSETS = ['potion', 'sword', 'humanoid', 'chest', 'character', 'prop', 'scene'] as const;

const REQUIRED_ANCHORS: Record<string, string[]> = {
  potion: ['cork_top', 'base_pivot'],
  sword: ['grip_pivot', 'blade_tip'],
  humanoid: ['foot_origin', 'hand_weapon'],
  chest: ['lid_pivot'],
  character: ['hand', 'foot_origin'],
  prop: ['handle_top', 'base_pivot'],
  scene: ['well_center', 'rope_hook'],
};

const workspaces: string[] = [];

function workspace(asset: string): string {
  const dir = mkdtempSync(join(tmpdir(), `px-art-${asset}-`));
  workspaces.push(dir);
  return dir;
}

interface Envelope {
  ok?: boolean;
  exit_code?: number;
  sha256?: string;
  findings?: Array<{ severity: string; code: string }>;
  warnings?: Array<{ code: string }>;
  error?: { code: string; message: string };
}

function call(cwd: string, verb: string, argv: Array<string | number | unknown>): Envelope {
  const tokens: string[] = [];
  for (const arg of argv) {
    tokens.push(typeof arg === 'string' ? arg : JSON.stringify(arg));
  }
  let stdout = '';
  let stderr = '';
  const code = runCli([verb, ...tokens], {
    cwd,
    stdout: (text: string) => {
      stdout += text;
    },
    stderr: (text: string) => {
      stderr += text;
    },
  });
  if (code !== 0 && code !== EXIT_LINT) {
    throw new Error(`${verb} failed (${code}): ${stderr || stdout}`);
  }
  const envelope = JSON.parse(stdout) as Envelope;
  envelope.exit_code = code;
  return envelope;
}

afterAll(() => {
  for (const dir of workspaces) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe.each(ASSETS)('art asset %s', (asset) => {
  const dir = join(ROOT, asset);
  const recipePath = join(ROOT, asset, `${asset}.px.json`);

  it('ships a recipe, a transcript, a design note and a digest', () => {
    for (const name of [
      `${asset}.px.json`,
      `${asset}.calls.json`,
      `${asset}.design.md`,
      `${asset}.sha256`,
    ]) {
      expect(readFileSync(join(dir, name), 'utf8').length).toBeGreaterThan(0);
    }
    expect(readFileSync(join(dir, `${asset}.sha256`), 'utf8').trim()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('declares parts, at least two materials, and its required anchors', () => {
    const { recipe, warnings } = parseRecipe(readFileSync(recipePath, 'utf8'));
    expect(warnings).toEqual([]);
    const parts = recipeParts(recipe);
    expect(Object.keys(parts).length).toBeGreaterThanOrEqual(2);
    const materials = new Set(Object.values(parts).map((part) => part.material));
    expect(materials.size).toBeGreaterThanOrEqual(2);
    for (const anchor of REQUIRED_ANCHORS[asset] ?? []) {
      expect(recipe.anchors[anchor]).toBeDefined();
      const [x, y] = recipe.anchors[anchor] ?? [0, 0];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(recipe.meta.width);
      expect(y).toBeLessThan(recipe.meta.height);
    }
    for (const [name, [x, y]] of Object.entries(recipe.anchors)) {
      expect(x, `${asset} anchor ${name} x`).toBeLessThan(recipe.meta.width);
      expect(y, `${asset} anchor ${name} y`).toBeLessThan(recipe.meta.height);
    }
  });

  it('records a transcript inside the call budget with one strict render', () => {
    const transcript = JSON.parse(readFileSync(join(dir, `${asset}.calls.json`), 'utf8')) as {
      asset: string;
      v: number;
      calls: Array<{ verb: string; argv: Array<string | number> }>;
    };
    expect(transcript.asset).toBe(asset);
    expect(transcript.v).toBe(1);
    expect(transcript.calls.length).toBeLessThanOrEqual(MAX_CALLS);
    const renders = transcript.calls.filter((entry) => entry.verb === 'render');
    expect(renders).toHaveLength(1);
    expect(renders[0]?.argv).toContain('--strict');
  });

  it('renders to the committed digest twice with no blocking finding', () => {
    const committed = readFileSync(join(dir, `${asset}.sha256`), 'utf8').trim();
    const first = call(workspace(asset), 'render', [
      '--file',
      recipePath,
      '--out',
      'first.png',
      '--strict',
    ]);
    const second = call(workspace(asset), 'render', [
      '--file',
      recipePath,
      '--out',
      'second.png',
      '--strict',
    ]);
    expect(first.exit_code).not.toBe(EXIT_LINT);
    expect(first.sha256).toBe(committed);
    expect(second.sha256).toBe(committed);
    const blocking = (first.findings ?? []).filter(
      (finding) => finding.severity === 'error' || finding.severity === 'warning',
    );
    expect(blocking).toEqual([]);
  });
});
