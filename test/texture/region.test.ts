/**
 * AC-10: a part smaller than one lattice period still gets a legal mark.
 *
 * The lattice keys off absolute canvas coordinates, so a 4x4 part sitting at
 * (1,1) can fall between every 3x3 mark and receive nothing at density 2. That
 * was the humanoid leg's fate (9x8, full fit, zero marks). Region fit anchors
 * one whole mark on a pixel the part already owns; it never clips a mark,
 * because a sliver would break the cluster floor `texture` depends on.
 */

import { describe, expect, it } from 'vitest';
import { SlotCanvas } from '../../src/core/canvas.js';
import { applyTexture } from '../../src/core/ops/texture.js';

function leg(): SlotCanvas {
  const canvas = new SlotCanvas(8, 8);
  for (let y = 1; y < 5; y += 1) {
    for (let x = 1; x < 5; x += 1) {
      canvas.set(x, y, 0, 0);
    }
  }
  return canvas;
}

function texture(fit: 'full' | 'region') {
  const canvas = leg();
  const source = canvas.slots.slice();
  const owners = canvas.owners.slice();
  return applyTexture(canvas, source, owners, 0, 1, 0, 'stipple', 3, 2, fit);
}

describe('texture region fit', () => {
  it('paints nothing with full fit when the lattice misses the part', () => {
    expect(texture('full').painted).toBe(0);
  });

  it('places one whole mark with region fit', () => {
    const outcome = texture('region');
    expect(outcome.marks).toBe(1);
    expect(outcome.painted).toBe(9);
  });

  it('still refuses a part thinner than one mark', () => {
    const canvas = new SlotCanvas(8, 8);
    for (let x = 1; x < 3; x += 1) {
      canvas.set(x, 1, 0, 0);
      canvas.set(x, 2, 0, 0);
    }
    const outcome = applyTexture(
      canvas,
      canvas.slots.slice(),
      canvas.owners.slice(),
      0,
      1,
      0,
      'stipple',
      3,
      2,
      'region',
    );
    expect(outcome.painted).toBe(0);
  });
});
