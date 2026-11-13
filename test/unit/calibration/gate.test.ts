/**
 * A gate is only meaningful if the per-criterion targets it names can add up to
 * it. This test parses the target table out of `docs/rubric.md` and checks that
 * arithmetic for both tiers, so a specification cannot state targets that leave
 * a tier unreachable — which is exactly what the 2026-11-13 rubric did, with a
 * target vector summing to 23.5 against the 24.0 its 4.0 gate required.
 *
 * The exceptional tier may also be documented as `unreachable`, but only
 * deliberately: that status must cite dated evidence and must actually be
 * arithmetically short of the tier. The pair of checks makes silent drift in
 * either direction fail.
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
  publishableMean: number;
  publishableFloor: number;
  exceptionalMean: number;
  exceptionalFloor: number;
  exceptionalStatus: 'reachable' | 'unreachable' | null;
  evidence: string | null;
  targets: Map<string, number>;
}

function cell(body: string, label: string): string | null {
  const pattern = new RegExp(`${label}\\s*\\|([^|\\n]+)`, 'i');
  return pattern.exec(body)?.[1]?.replaceAll('`', '').trim() || null;
}

function number(body: string, label: string): number {
  const raw = cell(body, label);
  const value = Number(raw?.replaceAll('*', ''));
  if (!Number.isFinite(value)) {
    throw new Error(`the target vector section must state "${label}" as a number`);
  }
  return value;
}

/** Read the `## Target vector` section: both tiers, the status and the targets. */
function parseGate(doc: string): Gate {
  const sections = doc.split(/^## /m);
  const section = sections.find((candidate) => candidate.startsWith('Target vector'));
  if (!section) {
    throw new Error('docs/rubric.md has no "## Target vector" section');
  }
  const body = section.slice(section.indexOf('\n') + 1);

  const statusCell = cell(body, 'exceptional status') ?? '';
  const exceptionalStatus = statusCell.includes('unreachable')
    ? 'unreachable'
    : statusCell.includes('reachable')
      ? 'reachable'
      : null;

  const targets = new Map<string, number>();
  for (const line of body.split('\n')) {
    const cells = line.split('|').map((entry) => entry.trim());
    if (cells.length < 4) continue;
    const name = cells[1].replaceAll('`', '');
    if (!CRITERIA.includes(name as (typeof CRITERIA)[number])) continue;
    const value = Number(cells[2].replaceAll('*', ''));
    if (!Number.isFinite(value)) {
      throw new Error(`target for ${name} is not a number: ${cells[2]}`);
    }
    targets.set(name, value);
  }

  return {
    publishableMean: number(body, 'publishable mean'),
    publishableFloor: number(body, 'publishable floor'),
    exceptionalMean: number(body, 'exceptional mean'),
    exceptionalFloor: number(body, 'exceptional floor'),
    exceptionalStatus,
    evidence: cell(body, 'evidence'),
    targets,
  };
}

const sum = (values: Iterable<number>) => [...values].reduce((total, value) => total + value, 0);

describe('acceptance gate arithmetic', () => {
  it('documents a target for every criterion', () => {
    const { targets } = parseGate(DOC);
    expect([...targets.keys()].sort()).toEqual([...CRITERIA].sort());
  });

  it('states a publishable tier the targets can actually reach', () => {
    const { publishableMean, publishableFloor, targets } = parseGate(DOC);
    expect(sum(targets.values())).toBeGreaterThanOrEqual(CRITERIA.length * publishableMean - 1e-9);
    for (const [criterion, value] of targets) {
      expect(value, `${criterion} is below the publishable floor`).toBeGreaterThanOrEqual(
        publishableFloor,
      );
    }
  });

  it('states whether the exceptional tier is reachable, and proves it', () => {
    const { exceptionalMean, exceptionalFloor, exceptionalStatus, evidence, targets } =
      parseGate(DOC);
    expect(exceptionalStatus, 'the exceptional tier must declare a status').not.toBeNull();
    const required = CRITERIA.length * exceptionalMean;

    if (exceptionalStatus === 'reachable') {
      expect(sum(targets.values())).toBeGreaterThanOrEqual(required - 1e-9);
      for (const [criterion, value] of targets) {
        expect(value, `${criterion} is below the exceptional floor`).toBeGreaterThanOrEqual(
          exceptionalFloor,
        );
      }
      return;
    }

    expect(sum(targets.values()), 'an unreachable tier must actually be short').toBeLessThan(
      required,
    );
    expect(evidence, 'an unreachable tier must cite evidence').toBeTruthy();
    expect(evidence).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
