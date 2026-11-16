/**
 * P2.T1 — a design supplies pass defaults; an explicit flag wins and is
 * reported, and restating the default is not an override.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import { type IntentCase, intentCase, makeIntentDir, removeIntentDir } from './helpers.js';

const cases: IntentCase[] = [];
const dirs: string[] = [];

function withDesign(ops: unknown[], design?: Record<string, unknown>): IntentCase {
  const built = intentCase({
    ops,
    design: { light: 'bottom-right', ...design },
  });
  cases.push(built);
  return built;
}

afterEach(() => {
  while (cases.length > 0) {
    cases.pop()?.cleanup();
  }
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) removeIntentDir(dir);
  }
});

describe('design defaults and deviation reporting', () => {
  it('records an explicit angle that overrides the declared light', () => {
    const { recipe } = withDesign([
      { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'steel.base', part: 'body' },
      { op: 'rect', x: 5, y: 1, w: 2, h: 4, color: 'wood.base', part: 'trim' },
      { op: 'light', angle: 'top-right', form: 'flat', ao: false, rim: 'none' },
    ]);
    expect(compileRecipe(recipe).deviations).toEqual([
      { op_index: 2, field: 'angle', declared: 'bottom-right', actual: 'top-right' },
    ]);
  });

  it('records no deviation when the flag equals the design default', () => {
    const { recipe } = withDesign([
      { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'steel.base', part: 'body' },
      { op: 'rect', x: 5, y: 1, w: 2, h: 4, color: 'wood.base', part: 'trim' },
      { op: 'light', angle: 'bottom-right', form: 'flat', ao: false, rim: 'none' },
    ]);
    expect(compileRecipe(recipe).deviations).toBeUndefined();
  });

  it('uses the declared light when the op omits an angle', () => {
    // No angle in the recipe: the compiler must resolve it from design.light,
    // not from the historical top-left default. Differing designs must render
    // differently for a part with a facing plane.
    const render = (light: string): string => {
      const dir = makeIntentDir();
      dirs.push(dir);
      const raw = JSON.stringify({
        version: '1.3',
        meta: { name: 'angle', width: 8, height: 8, alpha_mode: 'binary' },
        design: {
          subject: 'plane',
          light,
          hierarchy: ['body'],
          values: { body: 3 },
          edges: { silhouette: 'none', material: 'none', detail: 'none' },
          materials: ['steel'],
          style: '@project',
        },
        palette: {
          steel: {
            ramp: {
              outline: '#141414',
              shadow: '#4c4c4c',
              base: '#8c8c8c',
              highlight: '#e0e0e0',
            },
          },
        },
        parts: { body: { material: 'steel', facing: 'left', z: 1 } },
        anchors: {},
        layers: [
          {
            id: 'base',
            ops: [
              { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'steel.base', part: 'body' },
              { op: 'light', form: 'flat', ao: false, cast: null, rim: 'none' },
            ],
          },
        ],
      });
      const recipe = parseRecipe(raw, { baseDir: dir }).recipe;
      expect(compileRecipe(recipe).deviations).toBeUndefined();
      return JSON.stringify(Array.from(compileRecipe(recipe).flattened));
    };
    expect(render('top-left')).not.toBe(render('bottom-right'));
  });

  it('keeps part-less recipes byte-identical and free of deviations', () => {
    const dir = makeIntentDir();
    dirs.push(dir);
    const raw = JSON.stringify({
      version: '1.0',
      meta: { name: 'legacy', width: 8, height: 8, alpha_mode: 'binary' },
      palette: { ink: { colors: ['#000000', '#ffffff'] } },
      anchors: {},
      layers: [
        {
          id: 'base',
          ops: [
            { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'ink.1' },
            { op: 'light', form: 'flat', ao: false, cast: null, rim: 'none' },
          ],
        },
      ],
    });
    const compiled = compileRecipe(parseRecipe(raw, { baseDir: dir }).recipe);
    expect(compiled.deviations).toBeUndefined();
    expect(Array.from(compiled.flattened)).toEqual(
      Array.from(compileRecipe(parseRecipe(raw, { baseDir: dir }).recipe).flattened),
    );
  });
});
