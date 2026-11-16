/**
 * P2.T2 / AC-5 — with a design, `auto_outline` resolves each edge class to a
 * distinct rendered treatment from a snapshot taken before any pixel is written.
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

function baseOps(withOutline: boolean): unknown[] {
  return [
    { op: 'rect', x: 1, y: 1, w: 4, h: 4, color: 'steel.base', part: 'body' },
    { op: 'rect', x: 1, y: 1, w: 2, h: 2, color: 'steel.shadow', part: 'body' },
    { op: 'rect', x: 5, y: 1, w: 2, h: 4, color: 'wood.base', part: 'trim' },
    ...(withOutline ? [{ op: 'auto_outline', selective: true }] : []),
  ];
}

function slotAt(caseValue: IntentCase, x: number, y: number): string {
  const compiled = compileRecipe(caseValue.recipe);
  const slot = compiled.flattened[y * compiled.width + x] ?? -1;
  return compiled.slots.names[slot] ?? '<transparent>';
}

describe('design-driven edge treatments', () => {
  it('renders silhouette, material and detail as three distinguishable roles', () => {
    const withEdges = intentCase({ ops: baseOps(true) });
    cases.push(withEdges);

    const silhouette = slotAt(withEdges, 1, 2);
    const material = slotAt(withEdges, 4, 2);
    const detail = slotAt(withEdges, 3, 2);

    expect(silhouette).toBe('steel.outline');
    expect(material).toBe('wood.shadow');
    expect(detail).toBe('steel.highlight');
    expect(new Set([silhouette, material, detail]).size).toBe(3);

    // The opposite side of the material boundary borrows the other family too.
    expect(slotAt(withEdges, 5, 2)).toBe('steel.shadow');
  });

  it('leaves legacy auto_outline byte-identical when there is no design', () => {
    const withoutOutline = intentCase({
      design: null,
      ops: baseOps(false),
    });
    const withLegacyOutline = intentCase({
      design: null,
      ops: baseOps(true),
    });
    cases.push(withoutOutline, withLegacyOutline);

    // The legacy outer selective border still borrows the neighbour family's
    // outline role and never touches a painted pixel.
    expect(slotAt(withLegacyOutline, 0, 1)).toBe('steel.outline');
    expect(slotAt(withLegacyOutline, 7, 1)).toBe('wood.outline');
    expect(slotAt(withLegacyOutline, 1, 1)).toBe(slotAt(withoutOutline, 1, 1));
    expect(slotAt(withLegacyOutline, 3, 1)).toBe(slotAt(withoutOutline, 3, 1));
    expect(slotAt(withLegacyOutline, 0, 0)).toBe(slotAt(withoutOutline, 0, 0));
  });
});
