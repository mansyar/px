import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { type CliIo, runCli } from '../../src/cli/main.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { callTool } from '../../src/mcp/tools.js';
import { decodePng } from '../../src/render/png.js';
import { renderRecipe, sha256Hex } from '../../src/render/render.js';

/**
 * FR-10 / AC-8: the two judgement views are derived from the compiled sprite,
 * return a real PNG, and leave both the recipe and the committed normal render
 * byte-for-byte alone. `--out` is never the view's destination.
 */

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

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'px-views-'));
  dirs.push(dir);
  const init = io(dir);
  expect(
    runCli(
      [
        'init',
        '--file',
        'hero.px.json',
        '--width',
        '16',
        '--height',
        '16',
        '--palette',
        '#1a1c2c,#4a4a4a,#8c8c8c,#e0e0e0',
        '--parts',
        '{"body":{"material":"main"}}',
      ],
      init,
    ),
  ).toBe(0);
  const ops = [
    { op: 'rect', x: 2, y: 2, w: 12, h: 6, color: 'main.base', part: 'body' },
    { op: 'rect', x: 4, y: 9, w: 8, h: 5, color: 'main.highlight', part: 'body' },
  ];
  const draw = io(dir);
  expect(runCli(['draw', '--file', 'hero.px.json', '--ops', JSON.stringify(ops)], draw)).toBe(0);
  return dir;
}

function normalDigest(dir: string): string {
  const recipe = parseRecipe(readFileSync(join(dir, 'hero.px.json'), 'utf8'), {
    baseDir: dir,
  }).recipe;
  return sha256Hex(renderRecipe(recipe).png);
}

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('render judgement views (FR-10, AC-8)', () => {
  it('writes a three-band blockout sibling without touching the recipe or --out', () => {
    const dir = fixture();
    const baseline = io(dir);
    expect(runCli(['render', '--file', 'hero.px.json', '--out', 'hero.png'], baseline)).toBe(0);
    const recipeBefore = readFileSync(join(dir, 'hero.px.json'));
    const normalBefore = readFileSync(join(dir, 'hero.png'));
    const digestBefore = normalDigest(dir);

    const out = io(dir);
    expect(
      runCli(['render', '--file', 'hero.px.json', '--out', 'hero.png', '--blockout'], out),
    ).toBe(0);
    const payload = envelopeOf(out);
    expect(payload.out).toBe('hero.blockout.png');
    expect(payload.view).toMatchObject({ kind: 'blockout', bands: 3, outline: false });
    const viewBytes = readFileSync(join(dir, 'hero.blockout.png'));
    const view = decodePng(viewBytes);
    expect({ width: view.width, height: view.height }).toEqual({ width: 16, height: 16 });
    expect(sha256Hex(viewBytes)).not.toBe(sha256Hex(normalBefore));

    // Only the three shading roles may appear: never the outline, never a texture.
    const colours = new Set<string>();
    for (let index = 0; index < view.rgba.length; index += 4) {
      if ((view.rgba[index + 3] ?? 0) === 0) {
        continue;
      }
      const hex = `#${[0, 1, 2]
        .map((offset) => (view.rgba[index + offset] ?? 0).toString(16).padStart(2, '0'))
        .join('')}`;
      colours.add(hex);
    }
    expect(colours.size).toBeGreaterThan(0);
    expect(colours.size).toBeLessThanOrEqual(3);
    expect([...colours].every((hex) => ['#4a4a4a', '#8c8c8c', '#e0e0e0'].includes(hex))).toBe(true);

    expect(readFileSync(join(dir, 'hero.px.json'))).toEqual(recipeBefore);
    expect(readFileSync(join(dir, 'hero.png'))).toEqual(normalBefore);
    expect(normalDigest(dir)).toBe(digestBefore);
  });

  it('posterises into N grey steps, again leaving recipe and --out untouched', () => {
    const dir = fixture();
    const baseline = io(dir);
    expect(runCli(['render', '--file', 'hero.px.json', '--out', 'hero.png'], baseline)).toBe(0);
    const recipeBefore = readFileSync(join(dir, 'hero.px.json'));
    const normalBefore = readFileSync(join(dir, 'hero.png'));
    const digestBefore = normalDigest(dir);

    const out = io(dir);
    expect(
      runCli(['render', '--file', 'hero.px.json', '--out', 'hero.png', '--values', '5'], out),
    ).toBe(0);
    const payload = envelopeOf(out);
    expect(payload.out).toBe('hero.values5.png');
    expect(payload.view).toMatchObject({ kind: 'values', steps: 5 });
    expect(String(payload.view && (payload.view as { mapping?: string }).mapping)).toContain(
      '0.2126',
    );
    const view = decodePng(readFileSync(join(dir, 'hero.values5.png')));
    const levels = new Set<number>();
    for (let index = 0; index < view.rgba.length; index += 4) {
      if ((view.rgba[index + 3] ?? 0) === 0) {
        continue;
      }
      const [red, green, blue] = [view.rgba[index], view.rgba[index + 1], view.rgba[index + 2]];
      expect(red).toBe(green);
      expect(green).toBe(blue);
      levels.add(red ?? 0);
    }
    expect(levels.size).toBeGreaterThan(0);
    expect(levels.size).toBeLessThanOrEqual(5);
    for (const level of levels) {
      expect([0, 64, 128, 191, 255]).toContain(level);
    }

    expect(readFileSync(join(dir, 'hero.px.json'))).toEqual(recipeBefore);
    expect(readFileSync(join(dir, 'hero.png'))).toEqual(normalBefore);
    expect(normalDigest(dir)).toBe(digestBefore);
  });

  it('rejects invalid view combinations and step counts', () => {
    const dir = fixture();
    const cases: Array<{ argv: string[]; code: string }> = [
      {
        argv: ['--blockout', '--values', '5'],
        code: 'E_USAGE',
      },
      { argv: ['--blockout', '--debug'], code: 'E_USAGE' },
      { argv: ['--blockout', '--export'], code: 'E_USAGE' },
      { argv: ['--values', '1'], code: 'E_BAD_PARAM' },
      { argv: ['--values', '9'], code: 'E_BAD_PARAM' },
      { argv: ['--values', '2.5'], code: 'E_BAD_PARAM' },
    ];
    for (const testCase of cases) {
      const out = io(dir);
      expect(
        runCli(['render', '--file', 'hero.px.json', '--out', 'hero.png', ...testCase.argv], out),
      ).toBe(1);
      const payload = envelopeOf(out);
      expect((payload.error as { code: string }).code).toBe(testCase.code);
    }
  });

  it('returns the view image through the MCP render tool', () => {
    const dir = fixture();
    const baseline = io(dir);
    expect(runCli(['render', '--file', 'hero.px.json', '--out', 'hero.png'], baseline)).toBe(0);
    const normalBefore = readFileSync(join(dir, 'hero.png'));
    const recipeBefore = readFileSync(join(dir, 'hero.px.json'));
    const result = callTool(
      'px_render',
      { file: 'hero.px.json', out: 'hero.png', blockout: true },
      { cwd: dir },
    );
    expect(result.isError).toBeUndefined();
    const images = result.content.filter((block) => block.type === 'image');
    expect(images).toHaveLength(1);
    const image = images[0];
    expect(image?.type === 'image' && image.mimeType).toBe('image/png');
    const base64 = image?.type === 'image' ? image.data : '';
    expect(Buffer.from(base64, 'base64')).toEqual(readFileSync(join(dir, 'hero.blockout.png')));
    expect(readFileSync(join(dir, 'hero.png'))).toEqual(normalBefore);
    expect(readFileSync(join(dir, 'hero.px.json'))).toEqual(recipeBefore);
  });

  it('never creates a recipe file for a view', () => {
    const dir = fixture();
    const out = io(dir);
    expect(
      runCli(['render', '--file', 'hero.px.json', '--out', 'hero.png', '--values', '4'], out),
    ).toBe(0);
    const recipes = readdirSync(dir).filter((entry) => entry.endsWith('.px.json'));
    expect(recipes).toEqual(['hero.px.json']);
    // A stale sentinel proves no command rewrote an existing file either.
    writeFileSync(join(dir, 'sentinel.txt'), 'unchanged');
    const second = io(dir);
    expect(
      runCli(['render', '--file', 'hero.px.json', '--out', 'hero.png', '--blockout'], second),
    ).toBe(0);
    expect(readFileSync(join(dir, 'sentinel.txt'), 'utf8')).toBe('unchanged');
  });
});
