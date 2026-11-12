/**
 * Lint orchestration: run every rule, then put the findings in one canonical
 * order. Ordering is severity descending, code alphabetically, coordinate
 * row-major — never locale-dependent, so two machines agree byte for byte.
 */

import type { CompiledRecipe } from '../core/compile.js';
import { outOfBoundsRule } from './bounds.js';
import { lowContrastRule } from './contrast.js';
import { jaggyLineRule } from './jaggy.js';
import { orphanPixelRule } from './orphan.js';
import type { LintContext, LintCoord, LintFinding, LintRule, LintSeverity } from './types.js';

const SEVERITY_RANK: Record<LintSeverity, number> = { error: 0, warning: 1, info: 2 };

/** Every rule, in registration order. Ordering below is what reaches the caller. */
export const LINT_RULES: readonly LintRule[] = [
  outOfBoundsRule,
  orphanPixelRule,
  jaggyLineRule,
  lowContrastRule,
];

function firstCoord(finding: LintFinding): LintCoord | null {
  const coord = finding.coord ?? finding.coords?.[0];
  return coord ?? null;
}

/** Row-major coordinate order; unlocated findings sort last within their code. */
function compareCoords(a: LintCoord | null, b: LintCoord | null): number {
  if (a === null || b === null) {
    return a === b ? 0 : a === null ? 1 : -1;
  }
  if (a[1] !== b[1]) {
    return a[1] - b[1];
  }
  return a[0] - b[0];
}

export function compareFindings(a: LintFinding, b: LintFinding): number {
  const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (rank !== 0) {
    return rank;
  }
  if (a.code !== b.code) {
    return a.code < b.code ? -1 : 1;
  }
  return compareCoords(firstCoord(a), firstCoord(b));
}

export function lint(context: LintContext): LintFinding[] {
  const findings = LINT_RULES.flatMap((rule) => rule.evaluate(context));
  return findings.sort(compareFindings);
}

/** True when these findings should fail the command at the given strictness. */
export function lintBlocks(findings: readonly LintFinding[], strict: boolean): boolean {
  return findings.some(
    (finding) => finding.severity === 'error' || (strict && finding.severity === 'warning'),
  );
}

/** Lint a compiled recipe, the way every surface calls the linter. */
export function lintCompiled(compiled: CompiledRecipe): LintFinding[] {
  return lint({
    width: compiled.width,
    height: compiled.height,
    flattened: compiled.flattened,
    slots: compiled.slots,
    layers: compiled.layers.map((layer) => ({ id: layer.id, slots: layer.canvas.slots })),
    warnings: compiled.warnings,
  });
}

export { FindingCollector } from './collector.js';
export type {
  LintCode,
  LintContext,
  LintCoord,
  LintFinding,
  LintLayerView,
  LintRule,
  LintSeverity,
} from './types.js';
