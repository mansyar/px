/**
 * `OUT_OF_BOUNDS`.
 *
 * The compiler already reports one warning per clipped op, including the first
 * coordinate it clipped at. This rule translates those warnings into findings;
 * it never rescans the canvas, so it cannot drift from the op semantics.
 */

import { FindingCollector } from './collector.js';
import type { LintFinding, LintRule } from './types.js';

export const outOfBoundsRule: LintRule = {
  code: 'OUT_OF_BOUNDS',
  severity: 'warning',
  evaluate(context) {
    const collector = new FindingCollector('OUT_OF_BOUNDS', 'warning');
    for (const warning of context.warnings) {
      if (warning.code !== 'W_OUT_OF_BOUNDS') {
        continue;
      }
      const finding: Omit<LintFinding, 'code' | 'severity'> = { message: warning.message };
      if (warning.coord !== undefined) {
        finding.coord = warning.coord;
      }
      if (warning.layer !== undefined) {
        finding.layer = warning.layer;
      }
      if (warning.op_index !== undefined) {
        finding.op_index = warning.op_index;
      }
      collector.add(finding);
    }
    return collector.finish();
  },
};
