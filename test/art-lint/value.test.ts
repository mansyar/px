/**
 * AC-16: two parts that meet within one ramp step are one shape to the eye.
 *
 * The rule compares material base tones, never the pixels on the boundary, so a
 * shaded blade and a flat guard still collide when their bases are near-equal.
 */

import { describe, expect, it } from 'vitest';
import { buildSlotTable } from '../../src/core/palette.js';
import { lint, lintCompiled } from '../../src/lint/index.js';
import { baseOnly, compileSprite, ofCode } from './helpers.js';

const STEEL = baseOnly('#808080');
const NEAR = baseOnly('#858585');
const DARK = baseOnly('#303030');
const LIGHT = baseOnly('#c0c0c0');

const BLADE = { op: 'rect', x: 0, y: 0, w: 8, h: 16, color: 'steel.base', part: 'blade' };
const GUARD = { op: 'rect', x: 8, y: 0, w: 8, h: 16, color: 'iron.base', part: 'guard' };

function colliding(ops: unknown[] = [BLADE, GUARD]) {
  return compileSprite(ops, {
    palette: { steel: STEEL, iron: NEAR },
    parts: { blade: { material: 'steel' }, guard: { material: 'iron' } },
  });
}

describe('VALUE_COLLISION', () => {
  it('fires when two adjacent parts share a base value', () => {
    const findings = ofCode(lintCompiled(colliding()), 'VALUE_COLLISION');
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: 'warning', coord: [7, 0], part: 'blade' });
    const message = findings[0]?.message ?? '';
    expect(message).toContain('"blade"');
    expect(message).toContain('"guard"');
    expect(message).toContain('steel.base');
    expect(message).toContain('iron.base');
    expect(message).toContain('0.019');
    expect(message).toContain('0.06');
  });

  it('reports the pair once, not once per boundary pixel', () => {
    const findings = ofCode(lintCompiled(colliding()), 'VALUE_COLLISION');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.coords).toBeUndefined();
  });

  it('collides on identical base tones', () => {
    const compiled = compileSprite([BLADE, GUARD], {
      palette: { steel: STEEL, iron: baseOnly('#808080') },
      parts: { blade: { material: 'steel' }, guard: { material: 'iron' } },
    });
    const findings = ofCode(lintCompiled(compiled), 'VALUE_COLLISION');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('0.000');
  });

  it('stays silent when the bases are a full step apart', () => {
    const compiled = compileSprite([BLADE, GUARD], {
      palette: { steel: DARK, iron: LIGHT },
      parts: { blade: { material: 'steel' }, guard: { material: 'iron' } },
    });
    expect(ofCode(lintCompiled(compiled), 'VALUE_COLLISION')).toEqual([]);
  });

  it('ignores adjacency between two ops of the same part', () => {
    const compiled = compileSprite([BLADE, { ...BLADE, x: 8, color: 'iron.base', part: 'blade' }], {
      palette: { steel: STEEL, iron: NEAR },
      parts: { blade: { material: 'steel' } },
    });
    expect(ofCode(lintCompiled(compiled), 'VALUE_COLLISION')).toEqual([]);
  });

  it('ignores unowned pixels next to a part', () => {
    const compiled = compileSprite([BLADE, { ...GUARD, part: undefined }], {
      palette: { steel: STEEL, iron: NEAR },
      parts: { blade: { material: 'steel' } },
    });
    expect(ofCode(lintCompiled(compiled), 'VALUE_COLLISION')).toEqual([]);
  });

  it('emits nothing without declared parts', () => {
    const compiled = compileSprite(
      [
        { ...BLADE, part: undefined },
        { ...GUARD, part: undefined },
      ],
      { palette: { steel: STEEL, iron: NEAR } },
    );
    expect(ofCode(lintCompiled(compiled), 'VALUE_COLLISION')).toEqual([]);
  });

  it('compares the plane each part paints, not the material they share', () => {
    const WOOD = { ramp: { shadow: '#3a2a1e', base: '#7a5b3a', highlight: '#c9a878' } };
    const compiled = compileSprite(
      [
        { op: 'rect', x: 0, y: 0, w: 8, h: 16, color: 'wood.base', part: 'roof_l' },
        { op: 'rect', x: 8, y: 0, w: 8, h: 16, color: 'wood.shadow', part: 'roof_r' },
      ],
      {
        palette: { wood: WOOD },
        parts: {
          roof_l: { material: 'wood', facing: 'left' },
          roof_r: { material: 'wood', facing: 'right' },
        },
      },
    );
    expect(ofCode(lintCompiled(compiled), 'VALUE_COLLISION')).toEqual([]);
  });

  it('still reports two planes that wear the same tone, as a plane comparison', () => {
    const WOOD = { ramp: { shadow: '#3a2a1e', base: '#7a5b3a', highlight: '#c9a878' } };
    const compiled = compileSprite(
      [
        { op: 'rect', x: 0, y: 0, w: 8, h: 16, color: 'wood.base', part: 'roof_l' },
        { op: 'rect', x: 8, y: 0, w: 8, h: 16, color: 'wood.base', part: 'roof_r' },
      ],
      {
        palette: { wood: WOOD },
        parts: {
          roof_l: { material: 'wood', facing: 'left' },
          roof_r: { material: 'wood', facing: 'left' },
        },
      },
    );
    const findings = ofCode(lintCompiled(compiled), 'VALUE_COLLISION');
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('plane-resolved');
  });

  it('accepts a seam drawn as its own part, which is how a gable ridge is built', () => {
    const WOOD = { ramp: { shadow: '#3a2a1e', base: '#7a5b3a', highlight: '#c9a878' } };
    // A ridge part has to clear one synthesis step from both planes, which is
    // why the scene gives its ridge a distinct tone rather than the material's
    // outline; a near-black ridge sits inside the shadow plane's step.
    const OUTLINE = baseOnly('#d8cabc');
    const compiled = compileSprite(
      [
        { op: 'rect', x: 0, y: 0, w: 7, h: 16, color: 'wood.base', part: 'roof_l' },
        { op: 'rect', x: 8, y: 0, w: 8, h: 16, color: 'wood.shadow', part: 'roof_r' },
        { op: 'rect', x: 7, y: 0, w: 1, h: 16, color: 'ridge.base', part: 'ridge' },
      ],
      {
        palette: { wood: WOOD, ridge: OUTLINE },
        parts: {
          roof_l: { material: 'wood', facing: 'left' },
          roof_r: { material: 'wood', facing: 'right' },
          ridge: { material: 'ridge' },
        },
      },
    );
    expect(ofCode(lintCompiled(compiled), 'VALUE_COLLISION')).toEqual([]);
  });

  it('needs a base role on both materials', () => {
    const compiled = colliding([
      { ...BLADE, color: 'steel.shadow' },
      { ...GUARD, color: 'iron.shadow' },
    ]);
    // Compilation rejects an incomplete material, so the rule's own guard is
    // exercised against a context that names two families without bases.
    const findings = lint({
      width: compiled.width,
      height: compiled.height,
      flattened: compiled.flattened,
      slots: buildSlotTable({
        steel: { ramp: { shadow: '#808080' } },
        iron: { ramp: { shadow: '#858585' } },
      }),
      layers: compiled.layers.map((layer) => ({ id: layer.id, slots: layer.canvas.slots })),
      warnings: [],
      owners: compiled.owners,
      parts: compiled.parts,
    });
    expect(ofCode(findings, 'VALUE_COLLISION')).toEqual([]);
  });
});
