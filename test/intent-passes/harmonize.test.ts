/**
 * P2.T4 / AC-6 — harmonize recolours existing pixels across every part without
 * changing the painted-slot mask, ownership, cast shadows or cleanup results.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/cli/main.js';
import { compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { serializeRecipe } from '../../src/core/recipe/serialize.js';
import { callTool, MCP_TOOLS } from '../../src/mcp/tools.js';
import type { IntentCase } from './helpers.js';
import { intentCase } from './helpers.js';

const cases: IntentCase[] = [];

afterEach(() => {
  while (cases.length > 0) {
    cases.pop()?.cleanup();
  }
});

const PAINT_OPS = [
  { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'steel.base', part: 'body' },
  { op: 'rect', x: 5, y: 1, w: 2, h: 4, color: 'wood.base', part: 'trim' },
];

function withHarmonize(include: boolean): IntentCase {
  const built = intentCase({
    design: { light: 'bottom-right', values: { body: 1, trim: 5 } },
    parts: {
      body: { material: 'steel', facing: 'left', z: 1 },
      trim: { material: 'wood', facing: 'right', z: 2 },
    },
    ops: [
      ...PAINT_OPS,
      {
        op: 'light',
        angle: 'top-left',
        form: 'flat',
        ao: false,
        cast: 'body',
        cast_offset: 1,
        rim: 'none',
      },
      { op: 'auto_outline', selective: true },
      { op: 'seal' },
      ...(include ? [{ op: 'harmonize' }] : []),
    ],
  });
  cases.push(built);
  return built;
}

function envelopeFrom(args: string[], cwd: string): Record<string, unknown> {
  let raw = '';
  const code = runCli(args, {
    cwd,
    stdout: (text) => {
      raw += text;
    },
    stderr: () => undefined,
  });
  expect(code).toBe(0);
  return JSON.parse(raw) as Record<string, unknown>;
}

describe('harmonize', () => {
  it('changes colours across all parts while mask and ownership stay byte-identical', () => {
    const before = compileRecipe(withHarmonize(false).recipe);
    const after = compileRecipe(withHarmonize(true).recipe);

    expect(Array.from(after.flattened).map((slot) => slot !== -1)).toEqual(
      Array.from(before.flattened).map((slot) => slot !== -1),
    );
    expect(Array.from(after.owners)).toEqual(Array.from(before.owners));
    expect(after.cleanup?.length).toBe(before.cleanup?.length);

    let bodyChanged = false;
    let trimChanged = false;
    for (let index = 0; index < after.flattened.length; index += 1) {
      if (after.flattened[index] === before.flattened[index]) {
        continue;
      }
      if (after.owners[index] === 0) bodyChanged = true;
      if (after.owners[index] === 1) trimChanged = true;
    }
    expect(bodyChanged).toBe(true);
    expect(trimChanged).toBe(true);
  });

  it('warns with W_HARMONIZE_NOOP when there is no intent to apply', () => {
    const built = intentCase({
      design: null,
      ops: [...PAINT_OPS, { op: 'harmonize' }],
    });
    cases.push(built);
    const codes = compileRecipe(built.recipe).warnings.map((warning) => warning.code);
    expect(codes).toContain('W_HARMONIZE_NOOP');
  });

  it('round-trips through the canonical serializer', () => {
    const built = intentCase({
      ops: [...PAINT_OPS, { op: 'harmonize', where: 'outer', target_layer: 'base' }],
    });
    cases.push(built);
    const text = serializeRecipe(built.recipe);
    expect(text).toContain('"op": "harmonize"');
    expect(text).toContain('"where": "outer"');
    expect(text).toContain('"target_layer": "base"');
    const again = parseRecipe(text, { baseDir: built.dir }).recipe;
    expect(serializeRecipe(again)).toBe(text);
  });

  it('is reachable from both CLI draw and the existing px_draw MCP tool', () => {
    const built = withHarmonize(false);
    const file = join(built.dir, 'r.px.json');
    writeFileSync(file, serializeRecipe(built.recipe));
    const ops = JSON.stringify([{ op: 'harmonize' }]);

    const cli = envelopeFrom(
      ['draw', '--file', 'r.px.json', '--layer', 'base', '--ops', ops],
      built.dir,
    );
    expect(cli.ok).toBe(true);

    const result = callTool(
      'px_draw',
      { file: 'r.px.json', layer: 'base', ops },
      { cwd: built.dir },
    );
    expect(result.isError).toBeUndefined();
    expect(MCP_TOOLS).not.toContain('px_harmonize');
  });
});
