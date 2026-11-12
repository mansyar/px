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

/**
 * Longest run that still counts as a staircase step. A run of four or more
 * lines is a straight edge (or a 4:1 slope), and a clean shape changes slope
 * there rather than wobbling: the segment is cut, so a chamfer meeting a
 * straight side is never reported. Calibrated on the four benchmarks (see
 * `docs/lint-thresholds.md`).
 */
export const JAGGY_MAX_RUN = 3;

/**
 * Step-length difference that counts as a kink. A clean diagonal alternates
 * between two run lengths that differ by one (Bresenham's staircase), so only
 * a jump of two or more is a wobble — and only when both neighbours agree,
 * which is what separates a jaggy from a curve that keeps changing slope.
 */
export const JAGGY_STEP_JUMP = 2;

/** Contrast floor for silhouette edge pixels against the preview backdrop. */
export const LOW_CONTRAST_MIN_RATIO = 1.5;

/** The preview backdrop: mid grey, the harshest common background for sprites. */
export const DEFAULT_BACKDROP_HEX = '#808080';

/**
 * Chebyshev radius searched for a painted neighbour.
 *
 * `bayer_25` is the sparsest lattice the engine itself emits: it lights (0,0),
 * (2,0), (0,2) and (2,2) of every 4x4 tile, so its nearest neighbour is two
 * pixels away in both axes. A radius of 1 cannot tell that sanctioned fade from
 * a defect and flagged every lit pixel of one; at 2 the dither is silent while a
 * pixel whose nearest painted pixel is three away still reports.
 */
export const ORPHAN_NEIGHBOUR_RADIUS = 2;

/**
 * The same backdrop resolved once. The contrast rule compares against this and
 * the debug sheet paints it, so the number quoted in a finding matches the
 * panel B backdrop an agent is looking at.
 */
export const LOW_CONTRAST_BACKDROP: Rgba = { r: 0x80, g: 0x80, b: 0x80, a: 255 };
