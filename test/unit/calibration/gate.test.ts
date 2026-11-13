/**
 * The acceptance gate is only meaningful if the per-criterion targets it names can
 * add up to it. This test parses the target table out of `docs/rubric.md` and
 * checks that arithmetic, so a specification cannot state targets that leave the
 * mean unreachable — which is exactly what the 2026-11-13 rubric did.
 *
 * A gate may also be documented as `unreachable`, but only deliberately: that
 * status must cite dated evidence and must actually be arithmetically short of
 * the gate. The pair of checks makes silent drift in either direction fail.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DOC = readFileSync('docs/rubric.md', 'utf8');

const CRITERIA = [
  'silhouette',
  'value_separation',
  'lighting',
  'edge_language',
  'cluster_discipline',
  'palette_craft',
] as const;

interface Gate {
  meanGate: number;
  floor: number;
  status: 'reachable' | 'unreachable' | null;
  evidence: string | null;
  targets: Map<string, number>;
}

/** Read the `## Target vector` section: the gate, the floor and one row per criterion. */
function parseGate(doc: string): Gate {
  const sections = doc.split(/^## /m);
  const section = sections.find((candidate) => candidate.startsWith('Target vector'));
  if (!section) {
    throw new Error('docs/rubric.md has no "## Target vector" section');
  }
  const body = section.slice(section.indexOf('\n') + 1);

  const meanGate = Number(/mean gate\s*\|\s*\**([0-9.]+)/i.exec(body)?.[1] ?? Number.NaN);
  const floor = Number(/per-criterion floor\s*\|\s*\**([0-9.]+)/i.exec(body)?.[1] ?? Number.NaN);
  if (!Number.isFinite(meanGate) || !Number.isFinite(floor)) {
    throw new Error(
      'the target vector section must state the mean gate and the per-criterion floor',
    );
  }

  const statusCell = /gate status\s*\|([^|\n]+)/i.exec(body)?.[1] ?? '';
  const status = statusCell.includes('unreachable')
    ? 'unreachable'
    : statusCell.includes('reachable')
      ? 'reachable'
      : null;
  const evidence = /evidence\s*\|([^|\n]+)/i.exec(body)?.[1]?.replaceAll('`', '').trim() || null;

  const targets = new Map<string, number>();
  for (const line of body.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    if (cells.length < 4) continue;
    const name = cells[1].replaceAll('`', '');
    if (!CRITERIA.includes(name as (typeof CRITERIA)[number])) continue;
    const value = Number(cells[2].replaceAll('*', ''));
    if (!Number.isFinite(value)) {
      throw new Error(`target for ${name} is not a number: ${cells[2]}`);
    }
    targets.set(name, value);
  }
  return { meanGate, floor, status, evidence, targets };
}

describe('acceptance gate arithmetic', () => {
  it('documents a target for every criterion', () => {
    const { targets } = parseGate(DOC);
    expect([...targets.keys()].sort()).toEqual([...CRITERIA].sort());
  });

  it('states whether the gate is reachable, and proves it', () => {
    const { meanGate, floor, status, evidence, targets } = parseGate(DOC);
    expect(status, 'the target vector must declare a gate status').not.toBeNull();
    const total = [...targets.values()].reduce((sum, value) => sum + value, 0);
    const required = CRITERIA.length * meanGate;

    if (status === 'reachable') {
      expect(total).toBeGreaterThanOrEqual(required - 1e-9);
      for (const [criterion, value] of targets) {
        expect(value, `${criterion} is below the documented floor`).toBeGreaterThanOrEqual(floor);
      }
      return;
    }

    expect(total, 'an unreachable gate must actually be short of the mean').toBeLessThan(required);
    expect(evidence, 'an unreachable gate must cite evidence').toBeTruthy();
    expect(evidence).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
