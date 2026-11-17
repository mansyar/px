/**
 * Deterministic branch coverage for the pure critique core (F1, AC-17).
 *
 * The CLI-driven gap-report tests exercise the happy path. These tests call the
 * pure builder directly so the alternate arms — no declared intent, an empty
 * canvas, faced planes, lint-driven cluster fixes and the ranking tie-break —
 * are measured too. Every case asserts the report it produces, not that a
 * module imported successfully.
 */

import { describe, expect, it } from 'vitest';
import { type CompiledRecipe, compileRecipe } from '../../src/core/compile.js';
import { normalizeDesign } from '../../src/core/design.js';
import { parseRecipe } from '../../src/core/recipe/parse.js';
import type { Recipe } from '../../src/core/recipe/types.js';
import {
  boundFindings,
  buildCritique,
  CRITIQUE_CRITERIA,
  type CritiqueFinding,
  emptyCritiqueFingerprint,
} from '../../src/critique/index.js';
import type { LintFinding } from '../../src/lint/types.js';

const STEEL = {
  steel: {
    ramp: {
      outline: '#000000',
      shadow: '#333333',
      base: '#888888',
      highlight: '#ffffff',
    },
  },
};

const DESIGN = {
  subject: 'prop',
  light: 'top-left',
  hierarchy: ['body'],
  values: { body: 3 },
  edges: { silhouette: 'outline', material: 'shadow', detail: 'highlight' },
  materials: ['steel'],
  style: '@project',
};

const RECT = { op: 'rect', x: 0, y: 0, w: 8, h: 8, color: 'steel.base', part: 'body' };

interface CaseOptions {
  design?: Record<string, unknown>;
  parts?: Record<string, unknown>;
  ops?: unknown[];
  palette?: Record<string, unknown>;
}

function build(options: CaseOptions = {}): { recipe: Recipe; compiled: CompiledRecipe } {
  const raw = {
    version: '1.2',
    meta: { name: 'crit', width: 8, height: 8, alpha_mode: 'binary' },
    palette: options.palette ?? STEEL,
    parts: options.parts ?? { body: { material: 'steel' } },
    anchors: {},
    layers: [{ id: 'base', ops: options.ops ?? [] }],
  };
  const recipe = parseRecipe(JSON.stringify(raw)).recipe;
  if (options.design !== undefined) {
    recipe.design = normalizeDesign(options.design);
  }
  return { recipe, compiled: compileRecipe(recipe) };
}

function critique(
  recipe: Recipe,
  compiled: CompiledRecipe,
  lint: readonly LintFinding[] = [],
): ReturnType<typeof buildCritique> {
  return buildCritique({ recipe, compiled, png: new Uint8Array([1, 2, 3, 4]), lint });
}

function finding(
  criterion: CritiqueFinding['criterion'],
  op: string,
  gap: number,
): CritiqueFinding {
  return {
    index: 0,
    criterion,
    intended: 'target',
    observed: 'observed',
    gap,
    fix: {
      op: { op: 'deband', marker: op },
      why: 'synthetic branch-order fixture',
      expected_delta: 'deband: +1',
    },
  };
}

describe('pure critique branches', () => {
  it('reports no target for every criterion when the recipe declares no design', () => {
    const { recipe, compiled } = build({ ops: [RECT] });
    const report = critique(recipe, compiled);
    const noTarget = report.criteria.filter((entry) => entry.intended === 'n/a (no design block)');
    expect(noTarget.map((entry) => entry.criterion)).toEqual([
      'silhouette',
      'value_separation',
      'lighting',
      'edge_language',
      'palette_craft',
    ]);
    expect(report.findings).toEqual([]);
    expect(report.fixes_total).toBe(0);
    expect(report.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('treats a directly built empty canvas as an empty report, not a fabricated finding', () => {
    const { recipe, compiled } = build({ design: DESIGN, parts: {}, ops: [] });
    const report = critique(recipe, compiled);
    expect(report.warnings.map((warning) => warning.code)).toContain('W_CRITIQUE_EMPTY');
    expect(report.findings).toEqual([]);
    expect(report.fingerprint).toBe(emptyCritiqueFingerprint());
    expect(report.criteria.map((entry) => entry.criterion)).toEqual([...CRITIQUE_CRITERIA]);
  });

  it('measures lighting against faced planes when parts declare a facing', () => {
    const { recipe, compiled } = build({
      design: DESIGN,
      parts: { body: { material: 'steel', facing: 'right' } },
      ops: [RECT],
    });
    const report = critique(recipe, compiled);
    const lighting = report.criteria.find((entry) => entry.criterion === 'lighting');
    expect(lighting?.observed).toMatch(/^\d+\/\d+ faced pixels agree with top-left$/);
    expect(lighting?.gap).toBeGreaterThanOrEqual(0);
    expect(lighting?.met).toBe(lighting?.gap === 0);
  });

  it('sums lint cluster findings, including an implicit count and banding evidence', () => {
    const { recipe, compiled } = build({ design: DESIGN, ops: [RECT] });
    const lint: LintFinding[] = [
      { code: 'CLUSTER_THIN', severity: 'warning', message: 'thin', count: 3 },
      { code: 'CLUSTER_THIN', severity: 'warning', message: 'thin' },
      { code: 'BANDING', severity: 'info', message: 'banding' },
    ];
    const report = critique(recipe, compiled, lint);
    const cluster = report.findings.find((entry) => entry.criterion === 'cluster_discipline');
    expect(cluster?.gap).toBe(4);
    expect(cluster?.observed).toContain('4 CLUSTER_THIN findings');
    expect(cluster?.observed).toContain('banding/noise evidence');
    expect(cluster?.fix.op).toMatchObject({ op: 'deband' });
    expect(cluster?.fix.expected_delta).toBe('cluster_discipline: -1 CLUSTER_THIN');
  });

  it('declares no edge classes when every declared treatment is none', () => {
    const none = {
      ...DESIGN,
      edges: { silhouette: 'none', material: 'none', detail: 'none' },
    };
    const { recipe, compiled } = build({ design: none, ops: [RECT] });
    const report = critique(recipe, compiled);
    const edges = report.criteria.find((entry) => entry.criterion === 'edge_language');
    expect(edges?.observed).toContain('0/0 edge classes treated');
    expect(edges?.met).toBe(true);
    expect(report.findings.some((entry) => entry.criterion === 'edge_language')).toBe(false);
  });

  it('breaks ranking ties on criterion then the canonical op, stably', () => {
    const same = 'cluster_discipline' as const;
    const ordered = boundFindings([
      finding(same, 'b', 5),
      finding(same, 'a', 5),
      finding(same, 'b', 5),
      finding('silhouette', 'z', 5),
    ]);
    expect(ordered.fixes_total).toBe(4);
    expect(ordered.findings.map((entry) => entry.fix.op)).toEqual([
      { op: 'deband', marker: 'a' },
      { op: 'deband', marker: 'b' },
      { op: 'deband', marker: 'b' },
      { op: 'deband', marker: 'z' },
    ]);
    expect(ordered.findings.map((entry) => entry.index)).toEqual([0, 1, 2, 3]);
  });
});
