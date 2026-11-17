import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { EXIT_LINT } from '../../src/cli/envelope.js';
import { runCli } from '../../src/cli/main.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { recipeParts } from '../../src/core/recipe/types.js';

/**
 * Guards the re-authored v2 art. These are NEW recipes with a declared design
 * block and a `@project` style; the seven originals and their digests are a
 * separate, immutable record and are pinned at the end of this file.
 *
 * The CLI resolves `@project` from the recipe's own directory, so each render
 * below copies the root style into a temporary workspace next to the recipe.
 * That exercises the real strict gate against the committed root style.
 */

const ROOT = join(process.cwd(), 'test/art');
const V2 = join(ROOT, 'v2');
const STYLE = join(process.cwd(), 'px.style.json');
const MAX_CALLS = 20;
const EDGE_VOCABULARY = ['none', 'outline', 'shadow', 'highlight'];

const ASSETS = ['humanoid', 'scene', 'sword', 'character', 'potion', 'chest', 'prop'] as const;

const REQUIRED_ANCHORS: Record<string, string[]> = {
  potion: ['cork_top', 'base_pivot'],
  sword: ['grip_pivot', 'blade_tip'],
  humanoid: ['foot_origin', 'hand_weapon'],
  chest: ['lid_pivot'],
  character: ['hand', 'foot_origin'],
  prop: ['handle_top', 'base_pivot'],
  scene: ['well_center', 'rope_hook'],
};

const HERO_PARTS: Record<string, string> = {
  humanoid: 'torso',
  scene: 'wall',
  sword: 'blade',
  character: 'torso',
  potion: 'glass',
  chest: 'lid',
  prop: 'flame',
};

const ORIGINAL_DIGESTS: Record<string, string> = {
  potion: '2ea4173c7b8e27cc6723e4acd4fffc38a412f7d32bc65308dd4bfb7fe6622a3e',
  humanoid: 'ebb87295b32deeb2ab5233ce45ba82eaded2513763717e6736196639ada368cb',
  scene: 'ab2567d4e976355272d13476d58604d50d402bf38b6a643f4cb74ea7b31280c5',
  sword: '722fc7dbac870e31e34c8359a6a623b57a96396d900aba81489d8161b9290ee2',
  character: '18e12c69b28b73d87faf2e5a843f7516364d61cc4e6eab6e8c7ed229c27d039b',
  chest: '07193f4570790b3d5c4df8cf2a8bcf9339b3e63f70dbc36f5d36a101d06906b6',
  prop: '9c6bd6d9d13da48e29332f8076cb27330eebcc6400f83f7aaa5663916a879c31',
};

const workspaces: string[] = [];

function workspace(asset: string): string {
  const dir = mkdtempSync(join(tmpdir(), `px-art-v2-${asset}-`));
  workspaces.push(dir);
  return dir;
}

interface Envelope {
  exit_code?: number;
  sha256?: string;
  findings?: Array<{ severity: string; code: string }>;
}

function call(cwd: string, argv: Array<string | number>): Envelope {
  let stdout = '';
  let stderr = '';
  const code = runCli(argv.map(String), {
    cwd,
    stdout: (text: string) => {
      stdout += text;
    },
    stderr: (text: string) => {
      stderr += text;
    },
  });
  if (code !== 0 && code !== EXIT_LINT) {
    throw new Error(`render failed (${code}): ${stderr || stdout}`);
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

it('ships a root style with exactly the closed reader keys', () => {
  const style = JSON.parse(readFileSync(STYLE, 'utf8')) as Record<string, unknown>;
  expect(Object.keys(style).sort()).toEqual(
    ['allowed_ramps', 'default_light', 'edge_vocabulary', 'min_contrast', 'value_rules'].sort(),
  );
  expect(style.edge_vocabulary).toEqual(EDGE_VOCABULARY);
  expect(style.default_light).toBe('top-left');
});

describe.each(ASSETS)('v2 art asset %s', (asset) => {
  const dir = join(V2, asset);
  const recipePath = join(dir, `${asset}.px.json`);

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

  it('declares a real design block that resolves against the root style', () => {
    const parsed = parseRecipe(readFileSync(recipePath, 'utf8'), { baseDir: process.cwd() });
    expect(parsed.warnings).toEqual([]);
    const recipe = parsed.recipe;
    expect(['1.2', '1.3']).toContain(String(recipe.version));
    const design = recipe.design;
    expect(design).toBeDefined();
    if (design === undefined) return;
    expect(design.style).toBe('@project');
    expect(design.subject.length).toBeGreaterThan(0);
    expect(design.light).toBe('top-left');
    expect(design.hierarchy.length).toBeGreaterThanOrEqual(2);
    const hero = HERO_PARTS[asset];
    expect(design.hierarchy[0], `${asset} hero part`).toBe(hero);
    expect(design.hierarchy, `${asset} hierarchy is not alphabetical`).not.toEqual(
      [...design.hierarchy].sort(),
    );
    expect(readFileSync(join(dir, `${asset}.design.md`), 'utf8')).toContain(
      `**Hero part:** \`${hero}\``,
    );

    const style = JSON.parse(readFileSync(STYLE, 'utf8')) as {
      allowed_ramps: string[];
      edge_vocabulary: string[];
    };
    const parts = recipeParts(recipe);
    expect(new Set(Object.keys(parts)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(Object.values(parts).map((part) => part.material)).size).toBeGreaterThanOrEqual(
      2,
    );
    for (const part of design.hierarchy) {
      expect(parts[part]).toBeDefined();
      const value = design.values[part];
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(5);
    }
    for (const material of design.materials) {
      expect(style.allowed_ramps).toContain(material);
    }
    for (const treatment of Object.values(design.edges)) {
      expect(EDGE_VOCABULARY).toContain(treatment);
      expect(style.edge_vocabulary).toContain(treatment);
    }

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
    const cwd = workspace(asset);
    copyFileSync(recipePath, join(cwd, `${asset}.px.json`));
    copyFileSync(STYLE, join(cwd, 'px.style.json'));
    const argv = ['render', '--file', `${asset}.px.json`, '--out', 'first.png', '--strict'];
    const first = call(cwd, argv);
    expect(first.exit_code).not.toBe(EXIT_LINT);
    expect(first.sha256).toBe(committed);
    const second = call(cwd, [...argv.slice(0, -2), 'second.png', '--strict']);
    expect(second.exit_code).not.toBe(EXIT_LINT);
    expect(second.sha256).toBe(committed);
    const blocking = (first.findings ?? []).filter(
      (finding) => finding.severity === 'error' || finding.severity === 'warning',
    );
    expect(blocking).toEqual([]);

    // The source recipe is never rewritten by a verification run.
    expect(readFileSync(join(dir, `${asset}.sha256`), 'utf8').trim()).toBe(committed);
  });
});

it('leaves every original asset digest untouched', () => {
  for (const [asset, digest] of Object.entries(ORIGINAL_DIGESTS)) {
    expect(readFileSync(join(ROOT, asset, `${asset}.sha256`), 'utf8').trim(), asset).toBe(digest);
  }
});
