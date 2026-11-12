/**
 * Lint vocabulary.
 *
 * A rule is a pure function of a compiled canvas: flattened slot grid, palette,
 * layer buffers, and the compiler's warnings. No I/O, no clock, no PNG
 * decoding, so every rule runs on a tiny fixture in a unit test.
 */

import type { PxWarning } from '../core/errors.js';
import type { SlotTable } from '../core/palette.js';
import type { ScaleProfile } from '../core/profile.js';

export type LintSeverity = 'error' | 'warning' | 'info';

export type LintCode = 'OUT_OF_BOUNDS' | 'ORPHAN_PIXEL' | 'JAGGY_LINE' | 'LOW_CONTRAST';

export type LintCoord = [number, number];

export interface LintFinding {
  code: LintCode;
  severity: LintSeverity;
  message: string;
  /** One offending pixel. Mutually exclusive with `coords` in practice. */
  coord?: LintCoord;
  /** The pixels of a run, capped at the configured limit. */
  coords?: LintCoord[];
  /** Layer the finding came from, when the rule knows it. */
  layer?: string;
  /** Op index inside that layer, when the finding came from a compiler warning. */
  op_index?: number;
  /** Set on the marker finding that stands in for the findings past the cap. */
  truncated?: boolean;
  /** Total findings of this code, present only on a truncation marker. */
  count?: number;
}

export interface LintLayerView {
  id: string;
  /** The layer's own slot buffer, `-1` for transparent. */
  slots: Int16Array;
}

export interface LintContext {
  width: number;
  height: number;
  /** Later layers on top, `-1` for transparent. */
  flattened: Int16Array;
  slots: SlotTable;
  layers: readonly LintLayerView[];
  warnings: readonly PxWarning[];
  /**
   * The regime to judge this canvas at. Optional so a hand-built context still
   * works: absent means "derive it from the canvas size", which is what every
   * real surface passes.
   */
  profile?: ScaleProfile;
}

export interface LintRule {
  readonly code: LintCode;
  readonly severity: LintSeverity;
  evaluate(context: LintContext): LintFinding[];
}
