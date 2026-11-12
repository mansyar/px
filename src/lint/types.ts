/**
 * Lint vocabulary.
 *
 * A rule is a pure function of a compiled canvas: flattened slot grid, palette,
 * layer buffers, and the compiler's warnings. No I/O, no clock, no PNG
 * decoding, so every rule runs on a tiny fixture in a unit test.
 */

import type { PxWarning } from '../core/errors.js';
import type { Rgba, SlotTable } from '../core/palette.js';
import type { CompiledPart } from '../core/parts.js';
import type { ScaleProfile } from '../core/profile.js';

export type LintSeverity = 'error' | 'warning' | 'info';

export type LintCode =
  | 'BANDING'
  | 'CLUSTER_THIN'
  | 'DITHER_NOISE'
  | 'JAGGY_LINE'
  | 'LOW_CONTRAST'
  | 'ORPHAN_PIXEL'
  | 'OUT_OF_BOUNDS'
  | 'PILLOW_SHADE'
  | 'RAMP_NONMONOTONIC'
  | 'SILHOUETTE_LOSS'
  | 'VALUE_COLLISION';

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
  /**
   * Declared part the offending pixels belong to. Present exactly when they all
   * belong to one part: a finding that spans parts, or a canvas with no parts,
   * carries none.
   */
  part?: string;
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
  /**
   * Part index per pixel, from the compiler. Absent on a hand-built context,
   * where every part-scoped rule stays silent: a canvas with no ownership has
   * no parts to blame.
   */
  owners?: Int16Array;
  /** Declared parts, indexed by owner. Absent or empty means nothing is owned. */
  parts?: readonly CompiledPart[];
  /**
   * The backdrop the caller renders against, resolved. Absent means the default
   * mid grey every preview and the debug sheet use.
   */
  backdrop?: Rgba;
}

export interface LintRule {
  readonly code: LintCode;
  readonly severity: LintSeverity;
  evaluate(context: LintContext): LintFinding[];
}
