/**
 * Tuning targets for the lint rules.
 *
 * Phase 5 calibrates these against the four benchmark assets. Rules read the
 * constants here and nowhere else, so tuning is one edit and one golden run.
 */

import type { Rgba } from '../core/palette.js';

/**
 * Findings kept per code. Beyond this a single marker finding states the total,
 * so a 256×256 canvas can never put an unbounded array in a response.
 */
export const MAX_FINDINGS_PER_CODE = 50;

/** Coordinates quoted inside one finding, capped for the same reason. */
export const MAX_COORDS_PER_FINDING = 50;

/**
 * Consecutive staircase runs needed before a step sequence counts as jaggy.
 * Two runs are a corner; three are a sequence that can be uneven.
 */
export const JAGGY_MIN_RUNS = 3;

/** Contrast floor for silhouette edge pixels against the preview backdrop. */
export const LOW_CONTRAST_MIN_RATIO = 1.5;

/** The preview backdrop: mid grey, the harshest common background for sprites. */
export const DEFAULT_BACKDROP_HEX = '#808080';

/**
 * The same backdrop resolved once. The contrast rule compares against this and
 * the debug sheet paints it, so the number quoted in a finding matches the
 * panel B backdrop an agent is looking at.
 */
export const LOW_CONTRAST_BACKDROP: Rgba = { r: 0x80, g: 0x80, b: 0x80, a: 255 };
