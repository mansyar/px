import { describe, expect, it } from 'vitest';
import {
  type BriefScaffold,
  briefScaffold,
  getTemplate,
  knownSubjects,
  SUBJECTS,
} from '../../src/brief/index.js';
import { normalizeDesign } from '../../src/core/design.js';
import type { PxError } from '../../src/core/errors.js';
import {
  DESIGN_EDGE_CLASSES,
  DESIGN_VALUE_MAX,
  DESIGN_VALUE_MIN,
  EDGE_TREATMENTS,
  LIGHT_DIRS,
} from '../../src/core/recipe/types.js';

function codeOf(error: unknown): string | undefined {
  return (error as PxError).code;
}

describe('built-in brief templates', () => {
  it('ships three local subjects with plans, not prose', () => {
    expect(knownSubjects()).toEqual(['character', 'prop', 'scene']);
    for (const name of SUBJECTS) {
      const template = getTemplate(name);
      expect(template.subject).toBe(name);
      expect(template.parts.length).toBeGreaterThanOrEqual(3);
      expect(template.parts.filter((entry) => entry.hero)).toHaveLength(1);
      expect(LIGHT_DIRS).toContain(template.light);
      for (const edge of DESIGN_EDGE_CLASSES) {
        expect(EDGE_TREATMENTS).toContain(template.edges[edge]);
      }
      const materials = new Set(template.materials);
      for (const entry of template.parts) {
        expect(entry.name.length).toBeGreaterThan(0);
        expect(materials.has(entry.material)).toBe(true);
        expect(entry.proportion.min).toBeGreaterThan(0);
        expect(entry.proportion.min).toBeLessThanOrEqual(entry.proportion.max);
        expect(entry.proportion.max).toBeLessThanOrEqual(1);
        expect(Number.isInteger(entry.value)).toBe(true);
        expect(entry.value).toBeGreaterThanOrEqual(DESIGN_VALUE_MIN);
        expect(entry.value).toBeLessThanOrEqual(DESIGN_VALUE_MAX);
      }
    }
  });

  it('emits a structurally valid 1.2 design scaffold with aligned parts', () => {
    for (const name of SUBJECTS) {
      const scaffold: BriefScaffold = briefScaffold(name, 32);
      expect(scaffold.canvas).toEqual({ width: 32, height: 32 });
      expect(() => normalizeDesign(scaffold.design)).not.toThrow();
      expect(scaffold.design.hierarchy).toEqual(scaffold.parts.map((entry) => entry.name));
      expect(Object.keys(scaffold.design.values)).toEqual(scaffold.design.hierarchy);
      for (const entry of scaffold.parts) {
        expect(scaffold.design.values[entry.name]).toBe(entry.value);
        expect(scaffold.design.materials).toContain(entry.material);
        expect(entry.pixels.min).toBeGreaterThanOrEqual(1);
        expect(entry.pixels.min).toBeLessThanOrEqual(entry.pixels.max);
      }
      expect(scaffold.hero).toBe(scaffold.parts.find((entry) => entry.hero)?.name);
    }
  });

  it('scales the pixel hints with --size', () => {
    const small = briefScaffold('prop', 16);
    const large = briefScaffold('prop', 64);
    for (let index = 0; index < small.parts.length; index += 1) {
      expect(large.parts[index]?.pixels.min).toBeGreaterThan(small.parts[index]?.pixels.min ?? 0);
      expect(large.parts[index]?.pixels.max).toBeGreaterThan(small.parts[index]?.pixels.max ?? 0);
    }
  });

  it('rejects an unknown subject and lists every known one in the hint', () => {
    let caught: PxError | undefined;
    try {
      briefScaffold('dragon', 32);
    } catch (error) {
      caught = error as PxError;
    }
    expect(caught).toBeDefined();
    expect(caught?.code).toBe('E_SUBJECT_UNKNOWN');
    expect(caught?.message).toContain('dragon');
    for (const name of knownSubjects()) {
      expect(caught?.hint).toContain(name);
    }
  });

  it('rejects a bad size before looking up the subject', () => {
    for (const size of [4, 257, 7.5, Number.NaN]) {
      expect(() => briefScaffold('character', size)).toThrow();
      try {
        briefScaffold('character', size);
      } catch (error) {
        expect(codeOf(error)).toBe('E_BAD_PARAM');
      }
    }
  });
});
