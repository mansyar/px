import { describe, expect, it } from 'vitest';
import {
  FACING_VECTORS,
  planeDot,
  planeRole,
  towardLight,
  towardLightVector,
} from '../../src/core/facing.js';
import type { FacingName, LightDir } from '../../src/core/recipe/types.js';
import { compiled, planeCase, rows, slotAt, TONES } from './helpers.js';

/**
 * P1.T2 — plane tone resolution, and the frame it rests on.
 *
 * The single load-bearing assertion is the sign: under a `top-left` light a
 * `right`-facing plane must be *darker* than a `front`-facing one. If the frame
 * or the y-flip is inverted the primitive still "works" — every plane still
 * gets a tone — and every plane is wrong. So the dot products are asserted
 * directly, not only through a rendered role.
 */

const ANGLES: readonly LightDir[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

describe('the pinned frame', () => {
  it('puts the top-left light at (-1, -1) on screen and (-1, +1) in the frame', () => {
    expect(towardLight('top-left')).toEqual([-1, -1]);
    const vector = towardLightVector('top-left');
    expect(vector[0]).toBeCloseTo(-Math.SQRT1_2, 12);
    expect(vector[1]).toBeCloseTo(Math.SQRT1_2, 12);
    expect(vector[2]).toBe(0);
  });

  it('maps a screen step to the frame by negating y', () => {
    for (const angle of ANGLES) {
      const [sx, sy] = towardLight(angle);
      const [, fy] = towardLightVector(angle);
      expect(fy).toBeCloseTo(-sy / Math.hypot(sx, sy), 12);
    }
  });

  it('makes right darker than front under a top-left light', () => {
    expect(planeDot('front', 'top-left')).toBe(0);
    expect(planeDot('right', 'top-left')).toBeLessThan(0);
    expect(planeDot('left', 'top-left')).toBeGreaterThan(0);
  });

  it('treats every light as raking in the picture plane, so front is always neutral', () => {
    for (const angle of ANGLES) {
      expect(planeDot('front', angle)).toBeCloseTo(0, 12);
      expect(planeDot('back', angle)).toBeCloseTo(0, 12);
    }
  });

  it('agrees with the vector form of the same name', () => {
    for (const [name, vector] of Object.entries(FACING_VECTORS)) {
      for (const angle of ANGLES) {
        expect(planeDot(vector, angle)).toBeCloseTo(planeDot(name as FacingName, angle), 12);
      }
    }
  });
});

describe('plane bands', () => {
  it('gives the most light-facing plane the lightest role', () => {
    expect(planeDot('top', 'top-left')).toBeGreaterThan(0);
    expect(planeRole(planeDot('top', 'top-left'))).toBe('highlight');
  });

  it('gives the least light-facing plane the darkest role', () => {
    expect(planeRole(planeDot('right', 'top-left'))).toBe('shadow');
    expect(planeRole(planeDot('bottom', 'top-left'))).toBe('shadow');
  });

  it('keeps a perpendicular plane on the middle role', () => {
    expect(planeRole(0)).toBe('base');
  });

  it('splits the dot range into three equal bands', () => {
    expect(planeRole(1)).toBe('highlight');
    expect(planeRole(0.5)).toBe('highlight');
    expect(planeRole(0.2)).toBe('base');
    expect(planeRole(-0.2)).toBe('base');
    expect(planeRole(-0.5)).toBe('shadow');
    expect(planeRole(-1)).toBe('shadow');
  });

  it('quantises a fourth distinct facing onto the nearest of three roles', () => {
    // Three roles are the ceiling for every family, so two planes closer than
    // 70.5 degrees share a tone. The API says "plane", not "tone per facing";
    // this records the ceiling instead of pretending a fourth tone exists.
    const steep = planeDot([0.25881904510252074, 0.9659258262890683, 0], 'top-left');
    const top = planeDot('top', 'top-left');
    expect(steep).not.toBeCloseTo(top, 3);
    expect(planeRole(steep)).toBe('highlight');
    expect(planeRole(top)).toBe('highlight');
  });
});

describe('plane tone in a render', () => {
  it('shades two parts of the same material as two different planes (AC-2)', () => {
    const result = compiled(
      planeCase({
        front: { material: 'steel', facing: 'front' },
        right: { material: 'steel', facing: 'right' },
        top: { material: 'steel', facing: 'top' },
        bottom: { material: 'steel', facing: 'bottom' },
      }),
    );
    // One pixel per part, in sorted-name order: bottom, front, right, top.
    expect(rows(result)[0]?.slice(0, 4)).toBe('sbsh');
    expect(slotAt(result, 0, 0)).toBe('steel.shadow');
    expect(slotAt(result, 1, 0)).toBe('steel.base');
    expect(slotAt(result, 2, 0)).toBe('steel.shadow');
    expect(slotAt(result, 3, 0)).toBe('steel.highlight');
  });

  it('makes a right-facing part darker than an unshaded one (AC-1)', () => {
    const plain = compiled({
      parts: { body: { material: 'steel' } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 2, h: 2, color: 'steel.highlight', part: 'body' },
        { op: 'light', form: 'flat', ao: false, rim: 'none' },
      ],
    });
    const right = compiled({
      parts: { body: { material: 'steel', facing: 'right' } },
      ops: [
        { op: 'rect', x: 1, y: 1, w: 2, h: 2, color: 'steel.highlight', part: 'body' },
        { op: 'light', form: 'flat', ao: false, rim: 'none' },
      ],
    });
    // No facing: today's tone, untouched.
    expect(slotAt(plain, 1, 1)).toBe('steel.highlight');
    // Facing right under a top-left light: darker than a front-facing plane.
    expect(slotAt(right, 1, 1)).toBe('steel.shadow');
    expect(planeDot('right', 'top-left')).toBeLessThan(planeDot('front', 'top-left'));
  });

  it('rotates the plane when the light moves, keeping the same facing', () => {
    const topLeft = compiled(
      planeCase({ body: { material: 'steel', facing: 'left' } }, { light: { angle: 'top-left' } }),
    );
    const topRight = compiled(
      planeCase({ body: { material: 'steel', facing: 'left' } }, { light: { angle: 'top-right' } }),
    );
    expect(slotAt(topLeft, 0, 0)).toBe('steel.highlight');
    expect(slotAt(topRight, 0, 0)).toBe('steel.shadow');
  });

  it('honours an explicit vector exactly like the name it stands for', () => {
    const named = compiled(planeCase({ body: { material: 'steel', facing: 'right' } }));
    const vector = compiled(planeCase({ body: { material: 'steel', facing: [1, 0, 0] } }));
    expect(rows(vector)).toEqual(rows(named));
  });

  it('uses the three roles a tone-only family derives, never a fourth tone', () => {
    const result = compiled({
      palette: TONES,
      parts: {
        top: { material: 'clay', facing: 'top' },
        front: { material: 'clay', facing: 'front' },
        right: { material: 'clay', facing: 'right' },
      },
      ops: [
        { op: 'rect', x: 0, y: 0, w: 1, h: 1, color: 'clay.t1', part: 'front' },
        { op: 'rect', x: 1, y: 0, w: 1, h: 1, color: 'clay.t1', part: 'right' },
        { op: 'rect', x: 2, y: 0, w: 1, h: 1, color: 'clay.t1', part: 'top' },
        { op: 'light', form: 'flat', ao: false, rim: 'none' },
      ],
    });
    // Derived roles are t0 (highlight), t1 (base) and t3 (shadow); t2 is an
    // intermediate colour of the ladder, not a fourth plane.
    expect(slotAt(result, 0, 0)).toBe('clay.t1');
    expect(slotAt(result, 1, 0)).toBe('clay.t3');
    expect(slotAt(result, 2, 0)).toBe('clay.t0');
  });

  it('resolves roles from the part material, not from the slot it was painted with', () => {
    const result = compiled({
      parts: { body: { material: 'steel', facing: 'top' } },
      ops: [
        // Painted through a slot of the same family, but the rule is the
        // material's ramp: the plane still lands on steel.highlight.
        { op: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'steel.shadow', part: 'body' },
        { op: 'light', form: 'flat', ao: false, rim: 'none' },
      ],
    });
    expect(slotAt(result, 0, 0)).toBe('steel.highlight');
  });
});
