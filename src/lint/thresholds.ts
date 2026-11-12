/**
 * Lint limits and the compatibility constants.
 *
 * The *values* now live in one data table, `src/core/profile.ts`, because a
 * threshold that is right for a 32 px sprite is wrong for a 256 px one. Rules
 * read their numbers from `lintNumbers(context)` and never from this module;
 * what stays here is the two response bounds and the aliases below.
 *
 * The aliases are the `small` row under the names every fixture and every test
 * already uses. `small` is defined as exactly the numbers the engine was
 * calibrated against at 32 px, so re-exporting them keeps the old vocabulary
 * true: a name that no longer means a separate constant cannot drift from the
 * table. See `docs/art-profiles.md` for why each value is what it is.
 */

import type { Rgba } from '../core/palette.js';
import { PROFILES } from '../core/profile.js';

/** Findings kept per code; beyond this a marker states the true total. */
export const MAX_FINDINGS_PER_CODE = 50;

/** Coordinates quoted in one finding, so a shape finding stays bounded. */
export const MAX_COORDS_PER_FINDING = 50;

const SMALL = PROFILES.small;

/** Consecutive runs before a staircase is considered (`small`). */
export const JAGGY_MIN_RUNS = SMALL.jaggyMinRuns;

/** Longest run still read as a staircase step (`small`). */
export const JAGGY_MAX_RUN = SMALL.jaggyMaxRun;

/** Step-length difference that counts as a kink (`small`). */
export const JAGGY_STEP_JUMP = SMALL.jaggyStepJump;

/** Chebyshev radius searched for a neighbour (`small`, and every other row). */
export const ORPHAN_NEIGHBOUR_RADIUS = SMALL.orphanRadius;

/** WCAG contrast floor for edge pixels (`small`). */
export const LOW_CONTRAST_MIN_RATIO = SMALL.lowContrastMinRatio;

/** Mid grey preview backdrop: neither light nor dark, so nothing hides in it. */
export const DEFAULT_BACKDROP_HEX = '#808080';

/**
 * Luminance a boundary between two parts must clear before the shapes read as
 * separate. `0.06` is one synthesis step, so "within one ramp step" from AC-16
 * is exactly this number.
 */
export const VALUE_COLLISION_MIN_DELTA = 0.06;

/**
 * Checkerboard tiles one part needs before a `DITHER_NOISE` finding is worth
 * raising. Three tiles is a corner; four is the smallest patch that reads as a
 * field instead of an accident.
 */
export const DITHER_MIN_TILES = 4;

/** The backdrop above, resolved once and shared with the debug sheet's panel B. */
export const LOW_CONTRAST_BACKDROP: Rgba = { r: 0x80, g: 0x80, b: 0x80, a: 255 };
