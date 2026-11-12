/**
 * Scale profiles: the one table that tells the engine what size it is drawing at.
 *
 * Every number the linter, the cleanup passes and the debug sheet need is
 * calibrated per regime rather than per canvas. A 3 px run is a straight edge on
 * a 256 px scene element and a long wall on a 32 px sprite, so the same constant
 * cannot serve both: at 128 px and above the old 32 px numbers report legitimate
 * shallow curves as "long straight runs" and normal 3 px separation between
 * details as orphans.
 *
 * The boundaries are by the longest canvas side, so a 48x256 panel is `large`:
 * what matters is how much room the art was drawn in, not the smaller axis.
 *
 * This module is pure and O(1). Nothing here is cached across recipes: deriving a
 * profile is four comparisons, and a cache would be the thing that goes stale.
 */

import { PxError, type PxWarning } from './errors.js';

/** The four regimes, smallest first. Order is also the documentation order. */
export type ScaleProfile = 'tiny' | 'small' | 'medium' | 'large';

export const SCALE_PROFILES: readonly ScaleProfile[] = ['tiny', 'small', 'medium', 'large'];

/** Every tuning number a profile supplies. One row per regime, nothing implied. */
export interface ProfileNumbers {
  /** Consecutive staircase runs needed before a sequence counts as a jaggy. */
  readonly jaggyMinRuns: number;
  /** Longest run that still counts as a staircase step; longer runs are walls. */
  readonly jaggyMaxRun: number;
  /** Step-length difference that counts as a kink. */
  readonly jaggyStepJump: number;
  /** Chebyshev radius searched for a painted neighbour by `ORPHAN_PIXEL`. */
  readonly orphanRadius: number;
  /** WCAG contrast floor for silhouette edge pixels against the backdrop. */
  readonly lowContrastMinRatio: number;
  /** Smallest cluster that still reads as a detail (`strays`, `CLUSTER_THIN`). */
  readonly minCluster: number;
  /** Whether dither reads as a fade at this size rather than as noise. */
  readonly ditherAllowed: boolean;
  /** Ramp tones dither needs before it is a fade instead of a speckle. */
  readonly ditherMinTones: number;
  /** Depth `auto_outline` uses when an op names no width of its own. */
  readonly outlineWidth: number;
  /** Device pixels per source pixel in the debug sheet's zoom panel. */
  readonly debugZoom: number;
}

function row(numbers: ProfileNumbers): ProfileNumbers {
  return Object.freeze(numbers);
}

/**
 * The table. `small` is the compatibility row: it holds the numbers every
 * existing asset was calibrated against at 32 px, so a sprite between 17 and 48
 * px lints exactly as it did before profiles existed.
 *
 * `orphanRadius` is 2 in every row on purpose. It is not a size question: the
 * sparsest lattice the engine itself emits is `bayer_25`, whose lit cells sit two
 * pixels apart on both axes, so a radius of 1 would flag every sanctioned fade
 * and a radius of 3 would let a speck three pixels from real art pass. Do not
 * "fix" the one row that looks inconsistent — see `docs/art-profiles.md`.
 */
export const PROFILES: Readonly<Record<ScaleProfile, ProfileNumbers>> = Object.freeze({
  tiny: row({
    jaggyMinRuns: 3,
    jaggyMaxRun: 3,
    jaggyStepJump: 2,
    orphanRadius: 2,
    lowContrastMinRatio: 2.0,
    minCluster: 1,
    ditherAllowed: false,
    ditherMinTones: 3,
    outlineWidth: 1,
    debugZoom: 8,
  }),
  small: row({
    jaggyMinRuns: 3,
    jaggyMaxRun: 3,
    jaggyStepJump: 2,
    orphanRadius: 2,
    lowContrastMinRatio: 1.5,
    minCluster: 2,
    ditherAllowed: true,
    ditherMinTones: 3,
    outlineWidth: 1,
    debugZoom: 8,
  }),
  medium: row({
    jaggyMinRuns: 3,
    jaggyMaxRun: 4,
    jaggyStepJump: 2,
    orphanRadius: 2,
    lowContrastMinRatio: 1.35,
    minCluster: 2,
    ditherAllowed: true,
    ditherMinTones: 3,
    outlineWidth: 1,
    debugZoom: 4,
  }),
  large: row({
    jaggyMinRuns: 3,
    jaggyMaxRun: 6,
    jaggyStepJump: 3,
    orphanRadius: 2,
    lowContrastMinRatio: 1.25,
    minCluster: 3,
    ditherAllowed: true,
    ditherMinTones: 3,
    outlineWidth: 2,
    debugZoom: 2,
  }),
});

/**
 * The regime a canvas of this size draws in, by its longest side: 16 is `tiny`,
 * 17-48 `small`, 49-128 `medium`, 129-256 `large`.
 */
export function profileFor(width: number, height: number): ScaleProfile {
  const longest = Math.max(width, height);
  if (longest <= 16) {
    return 'tiny';
  }
  if (longest <= 48) {
    return 'small';
  }
  if (longest <= 128) {
    return 'medium';
  }
  return 'large';
}

/** The numbers for a named regime. */
export function profileNumbers(profile: ScaleProfile): ProfileNumbers {
  return PROFILES[profile];
}

/** The numbers a canvas of this size gets, derived once per lint or render. */
export function profileNumbersFor(width: number, height: number): ProfileNumbers {
  return PROFILES[profileFor(width, height)];
}

/**
 * `meta.profile` is one of the four names. Anything else is a caller mistake, so
 * the hint lists the accepted values rather than guessing the intended one.
 */
export function parseScaleProfile(value: unknown): ScaleProfile {
  const match =
    typeof value === 'string' ? SCALE_PROFILES.find((profile) => profile === value) : undefined;
  if (match === undefined) {
    throw new PxError(
      'E_PROFILE_UNKNOWN',
      `Recipe meta.profile is ${JSON.stringify(value)}, which is not a scale profile`,
      `Profile is one of ${SCALE_PROFILES.join(', ')}.`,
    );
  }
  return match;
}

/**
 * An override that contradicts the canvas is a warning, never an error: the
 * caller may deliberately target a style (a 256 px sheet drawn for a 32 px
 * regime), and the override is what governs the thresholds. One warning names
 * both so the mismatch is visible without being fatal.
 */
export function profileWarnings(
  declared: ScaleProfile,
  width: number,
  height: number,
): PxWarning[] {
  const derived = profileFor(width, height);
  if (declared === derived) {
    return [];
  }
  return [
    {
      code: 'W_PROFILE_MISMATCH',
      message: `Recipe meta.profile is "${declared}" but the ${width}x${height} canvas derives "${derived}"`,
      hint: `The override governs lint thresholds, cluster minimums, dither, outline thickness and debug zoom. Remove "profile" to follow the canvas size, or accept "${declared}".`,
    },
  ];
}
