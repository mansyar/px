import { describe, expect, it } from 'vitest';
import { compiled, paintedCount, roleRows } from './helpers.js';

/** Paint one part's pixels in a single op; the first part painted owns the cell. */
function paint(part: string, color: string, points: Array<[number, number]>) {
  return { op: 'set_pixels', points, color, part };
}

const BASE = ['steel.base', 'iron.base'] as const;

describe('light ao: occlusion between parts', () => {
  it('steps one role darker where a strictly higher part touches', () => {
    const compiledRecipe = compiled({
      parts: { front: { material: 'steel', z: 1 }, back: { material: 'iron', z: 3 } },
      ops: [
        paint('front', BASE[0], [
          [1, 1],
          [2, 1],
          [1, 2],
          [2, 2],
        ]),
        paint('back', BASE[1], [
          [3, 1],
          [3, 2],
        ]),
        { op: 'light', form: 'flat', ao: true, rim: 'none', cast: null },
      ],
    });
    // front darkens against back; back is taller, so it is never occluded by front.
    expect(roleRows(compiledRecipe).slice(0, 3)).toEqual(['........', '.bsb....', '.bsb....']);
  });

  it('never occludes at equal z', () => {
    const compiledRecipe = compiled({
      parts: { left: { material: 'steel' }, right: { material: 'iron' } },
      ops: [
        paint('left', BASE[0], [
          [1, 1],
          [1, 2],
        ]),
        paint('right', BASE[1], [
          [2, 1],
          [2, 2],
        ]),
        { op: 'light', form: 'flat', ao: true, rim: 'none', cast: null },
      ],
    });
    expect(roleRows(compiledRecipe).slice(0, 3)).toEqual(['........', '.bb.....', '.bb.....']);
  });

  it('does not reach across a transparent gap', () => {
    const compiledRecipe = compiled({
      parts: { left: { material: 'steel' }, right: { material: 'iron', z: 5 } },
      ops: [
        paint('left', BASE[0], [[1, 1]]),
        paint('right', BASE[1], [[3, 1]]),
        { op: 'light', form: 'flat', ao: true, rim: 'none', cast: null },
      ],
    });
    expect(roleRows(compiledRecipe)[1]).toBe('.b.b....');
  });

  it('clamps at the canvas edge instead of wrapping', () => {
    const compiledRecipe = compiled({
      parts: { left: { material: 'steel' }, right: { material: 'iron', z: 5 } },
      ops: [
        paint('left', BASE[0], [[0, 0]]),
        paint('right', BASE[1], [[1, 0]]),
        { op: 'light', form: 'flat', ao: true, rim: 'none', cast: null },
      ],
    });
    // The left and upper neighbours are outside the canvas: they are simply absent.
    expect(roleRows(compiledRecipe)[0]).toBe('sb......');
  });

  it('a part never occludes itself', () => {
    const compiledRecipe = compiled({
      parts: { body: { material: 'steel', z: 2 } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 3, h: 2, color: 'steel.base', part: 'body' },
        { op: 'light', form: 'flat', ao: true, rim: 'none', cast: null },
      ],
    });
    expect(roleRows(compiledRecipe).slice(1, 3)).toEqual(['.bbb....', '.bbb....']);
  });
});

describe('light ao: role stepping', () => {
  it('leaves an outline alone because it has no darker role', () => {
    const compiledRecipe = compiled({
      parts: { front: { material: 'steel', z: 1 }, back: { material: 'iron', z: 5 } },
      ops: [
        paint('front', 'steel.outline', [[1, 1]]),
        paint('back', BASE[1], [[2, 1]]),
        { op: 'light', form: 'flat', ao: true, rim: 'none', cast: null },
      ],
    });
    expect(roleRows(compiledRecipe)[1]).toBe('.ob.....');
  });

  it('leaves a family without shading roles alone, and does not fail', () => {
    const compiledRecipe = compiled({
      palette: {
        ink: { colors: ['#000000'] },
        iron: { ramp: { shadow: '#101010', base: '#303030' } },
      },
      parts: { front: { material: 'ink', z: 1 }, back: { material: 'iron', z: 5 } },
      ops: [
        paint('front', 'ink.0', [[1, 1]]),
        paint('back', 'iron.base', [[2, 1]]),
        { op: 'light', form: 'flat', ao: true, rim: 'none', cast: null },
      ],
    });
    expect(roleRows(compiledRecipe)[1]).toBe('.0b.....');
  });

  it('treats an undeclared part layer as one body that cannot occlude', () => {
    const compiledRecipe = compiled({
      ops: [
        { op: 'rect', x: 1, y: 1, w: 2, h: 2, color: 'steel.base' },
        { op: 'rect', x: 3, y: 1, w: 2, h: 2, color: 'iron.base' },
        { op: 'light', form: 'flat', ao: true, rim: 'none', cast: null },
      ],
    });
    expect(roleRows(compiledRecipe).slice(1, 3)).toEqual(['.bbbb...', '.bbbb...']);
  });
});

describe('light pass order', () => {
  it('deepens the bevel it just shaded, so form runs before ao', () => {
    const compiledRecipe = compiled({
      parts: { front: { material: 'steel', z: 1 }, back: { material: 'iron', z: 2 } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 3, h: 3, color: 'steel.base', part: 'front' },
        { op: 'rect', x: 4, y: 1, w: 1, h: 3, color: 'iron.base', part: 'back' },
        { op: 'light', angle: 'top-right', form: 'bevel', ao: true, rim: 'none', cast: null },
      ],
    });
    // A top-right light makes front's right column a highlight; AO then takes it
    // to base. Ao-before-form would leave the highlight in place (or a shadow).
    expect(roleRows(compiledRecipe).slice(1, 4)).toEqual(['.hhbh...', '.sbbh...', '.ssbh...']);
    expect(paintedCount(compiledRecipe)).toBe(12);
  });
});
