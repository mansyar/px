/**
 * Bounded finding collection.
 *
 * A rule hands every finding it sees to a collector. The collector stores at
 * most `MAX_FINDINGS_PER_CODE` of them and keeps counting, so the response stays
 * bounded while the truncation marker still reports the true total.
 */

import { MAX_FINDINGS_PER_CODE } from './thresholds.js';
import type { LintCode, LintFinding, LintSeverity } from './types.js';

export class FindingCollector {
  private readonly code: LintCode;
  private readonly severity: LintSeverity;
  private readonly kept: LintFinding[] = [];
  private total = 0;

  constructor(code: LintCode, severity: LintSeverity) {
    this.code = code;
    this.severity = severity;
  }

  /** Record one finding. Findings past the cap are counted but not stored. */
  add(finding: Omit<LintFinding, 'code' | 'severity'>): void {
    this.total += 1;
    if (this.kept.length >= MAX_FINDINGS_PER_CODE) {
      return;
    }
    this.kept.push({ code: this.code, severity: this.severity, ...finding });
  }

  /** The stored findings, plus a marker when anything was dropped. */
  finish(): LintFinding[] {
    if (this.total <= MAX_FINDINGS_PER_CODE) {
      return this.kept;
    }
    return [
      ...this.kept,
      {
        code: this.code,
        severity: this.severity,
        message: `${this.total} ${this.code} findings; showing the first ${MAX_FINDINGS_PER_CODE}`,
        truncated: true,
        count: this.total,
      },
    ];
  }
}
