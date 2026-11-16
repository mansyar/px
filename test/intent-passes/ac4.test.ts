/**
 * AC-4 — the declared light is the pass default, an explicit angle wins, and
 * the override is reported in one place with both values.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { compileRecipe } from '../../src/core/compile.js';
import type { IntentCase } from './helpers.js';
import { intentCase } from './helpers.js';

const cases: IntentCase[] = [];

afterEach(() => {
  while (cases.length > 0) {
    cases.pop()?.cleanup();
  }
});

function lightRecipe(angle?: string): IntentCase {
  const built = intentCase({
    design: { light: 'bottom-right' },
    parts: {
      body: { material: 'steel', facing: 'left', z: 1 },
      trim: { material: 'wood', facing: 'right', z: 2 },
    },
    ops: [
      { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'steel.base', part: 'body' },
      { op: 'rect', x: 5, y: 1, w: 2, h: 4, color: 'wood.base', part: 'trim' },
      {
        op: 'light',
        ...(angle === undefined ? {} : { angle }),
        form: 'flat',
        ao: false,
        cast: null,
        rim: 'none',
      },
    ],
  });
  cases.push(built);
  return built;
}

function painted(built: IntentCase): string {
  const compiled = compileRecipe(built.recipe);
  return JSON.stringify(Array.from(compiled.flattened));
}

describe('AC-4', () => {
  it('uses the declared default, honours an override, and reports only the override', () => {
    const declared = lightRecipe();
    const restated = lightRecipe('bottom-right');
    const override = lightRecipe('top-left');

    expect(painted(declared)).toBe(painted(restated));
    expect(painted(declared)).not.toBe(painted(override));
    expect(compileRecipe(declared.recipe).deviations).toBeUndefined();
    expect(compileRecipe(restated.recipe).deviations).toBeUndefined();
    expect(compileRecipe(override.recipe).deviations).toEqual([
      { op_index: 2, field: 'angle', declared: 'bottom-right', actual: 'top-left' },
    ]);
  });
});
